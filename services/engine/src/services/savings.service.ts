import type { Prisma } from "@prisma/client";
import prisma from "../prisma/index.js";
import { BadRequestException, NotFoundException } from "../lib/exception.js";

type TxClient = Parameters<typeof prisma.$transaction>[0] extends (
  tx: infer T
) => Promise<unknown>
  ? T
  : never;

export interface CreateJarInput {
  name: string;
  targetAmount?: number;
  lockUntil?: Date;
}

/**
 * Savings jars — personal money a user sets aside. Owns jar creation, lookup by
 * name (for chat commands), and crediting. Funding is a wallet debit + jar
 * credit (the dispatcher does both); `creditJar` records the deposit.
 */
class SavingsService {
  async createJar(workspaceId: string, userId: string, input: CreateJarInput) {
    const lockUntil = input.lockUntil;
    const status = lockUntil && lockUntil.getTime() > Date.now() ? "locked" : "active";
    return prisma.savingsJar.create({
      data: {
        workspaceId,
        ownerUserId: userId,
        name: input.name,
        targetAmount: input.targetAmount,
        lockUntil,
        status,
      },
    });
  }

  async findByName(workspaceId: string, name: string) {
    return prisma.savingsJar.findFirst({
      where: { workspaceId, name: { equals: name.trim(), mode: "insensitive" }, status: "active" },
    });
  }

  async list(workspaceId: string, userId?: string) {
    return prisma.savingsJar.findMany({
      where: { workspaceId, ...(userId ? { ownerUserId: userId } : {}), status: { in: ["active", "locked"] } },
      orderBy: { createdAt: "desc" },
    });
  }

  async get(workspaceId: string, jarId: string, userId?: string) {
    const jar = await prisma.savingsJar.findFirst({
      where: { id: jarId, workspaceId, ...(userId ? { ownerUserId: userId } : {}) },
    });
    if (!jar) throw new NotFoundException("Savings jar not found");
    return jar;
  }

  async getWithDeposits(workspaceId: string, jarId: string, userId?: string) {
    const jar = await this.get(workspaceId, jarId, userId);
    const deposits = await prisma.savingsTransaction.findMany({
      where: { savingsJarId: jar.id, type: "deposit", status: "completed" },
      orderBy: { createdAt: "desc" },
      take: 20,
      select: { amount: true, createdAt: true },
    });
    return { jar, deposits };
  }

  /** Credits a jar from a settled funding payment. Atomic; records the deposit. */
  async creditJar(jarId: string, amount: number, paymentId?: string) {
    return prisma.$transaction(async (tx: TxClient) => {
      const jar = await tx.savingsJar.findUnique({ where: { id: jarId } });
      if (!jar) throw new NotFoundException("Savings jar not found");

      await tx.savingsTransaction.create({
        data: { savingsJarId: jarId, paymentId, amount, type: "deposit", status: "completed" },
      });

      return tx.savingsJar.update({
        where: { id: jarId },
        data: { currentAmount: { increment: amount } },
      });
    });
  }

  async update(
    workspaceId: string,
    userId: string,
    jarId: string,
    input: {
      name: string;
      targetAmount?: number;
      lockUntil?: Date | null;
    }
  ) {
    const jar = await this.get(workspaceId, jarId, userId);
    const hasDeposits = jar.currentAmount > 0;

    const data: Prisma.SavingsJarUpdateInput = { name: input.name };

    if (input.lockUntil !== undefined) {
      data.lockUntil = input.lockUntil;
      data.status =
        input.lockUntil && input.lockUntil.getTime() > Date.now() ? "locked" : "active";
    }

    if (!hasDeposits && input.targetAmount !== undefined) {
      data.targetAmount = input.targetAmount;
    }

    return prisma.savingsJar.update({
      where: { id: jarId },
      data,
    });
  }

  async remove(workspaceId: string, userId: string, jarId: string): Promise<void> {
    const jar = await this.get(workspaceId, jarId, userId);
    if (jar.currentAmount > 0) {
      throw new BadRequestException("Can't delete a jar that already has savings");
    }

    await prisma.pendingPayment.deleteMany({ where: { savingsJarId: jarId } });
    await prisma.savingsJar.delete({ where: { id: jarId } });
  }

  async depositFromWallet(workspaceId: string, userId: string, jarId: string, amount: number) {
    if (amount <= 0) throw new BadRequestException("Amount must be greater than zero");

    return prisma.$transaction(async (tx: TxClient) => {
      const jar = await tx.savingsJar.findFirst({
        where: { id: jarId, workspaceId, ownerUserId: userId },
      });
      if (!jar) throw new NotFoundException("Savings jar not found");

      const wallet = await tx.wallet.upsert({
        where: { userId },
        create: { userId },
        update: {},
      });
      if (wallet.balance < amount) throw new BadRequestException("Insufficient balance");

      const nextBalance = wallet.balance - amount;
      await tx.walletTransaction.create({
        data: {
          walletId: wallet.id,
          type: "debit",
          amount,
          reason: "savings_deposit",
          balanceAfter: nextBalance,
        },
      });
      await tx.wallet.update({ where: { id: wallet.id }, data: { balance: nextBalance } });

      await tx.savingsTransaction.create({
        data: { savingsJarId: jar.id, amount, type: "deposit", status: "completed" },
      });
      const updatedJar = await tx.savingsJar.update({
        where: { id: jar.id },
        data: { currentAmount: { increment: amount } },
      });

      return { jar: updatedJar, walletBalance: nextBalance };
    });
  }
}

export const savingsService = new SavingsService();
export default savingsService;
