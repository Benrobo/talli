import type { Prisma } from "@prisma/client";
import prisma from "../prisma/index.js";
import { BadRequestException, NotFoundException } from "../lib/exception.js";
import { ledgerService } from "./ledger.service.js";
import { randomToken } from "../lib/utils.js";

type TxClient = Parameters<typeof prisma.$transaction>[0] extends (
  tx: infer T
) => Promise<unknown>
  ? T
  : never;

export interface CreateJarInput {
  name: string;
  icon?: string;
  accentColor?: string;
  targetAmount?: number;
  lockUntil?: Date;
}

export interface CreditJarOptions {
  referenceId?: string;
}

class SavingsService {
  async createJar(userId: string, input: CreateJarInput) {
    const lockUntil = input.lockUntil;
    const status = lockUntil && lockUntil.getTime() > Date.now() ? "locked" : "active";
    return prisma.savingsJar.create({
      data: {
        ownerUserId: userId,
        name: input.name,
        ...(input.icon ? { icon: input.icon } : {}),
        ...(input.accentColor ? { accentColor: input.accentColor } : {}),
        targetAmount: input.targetAmount,
        lockUntil,
        status,
      },
    });
  }

  async findByName(userId: string, name: string) {
    return prisma.savingsJar.findFirst({
      where: {
        ownerUserId: userId,
        name: { equals: name.trim(), mode: "insensitive" },
        status: "active",
      },
    });
  }

  async list(userId: string) {
    return prisma.savingsJar.findMany({
      where: { ownerUserId: userId, status: { in: ["active", "locked"] } },
      orderBy: { createdAt: "desc" },
    });
  }

  async get(userId: string, jarId: string) {
    const jar = await prisma.savingsJar.findFirst({
      where: { id: jarId, ownerUserId: userId },
    });
    if (!jar) throw new NotFoundException("Savings jar not found");
    return jar;
  }

  async getWithDeposits(userId: string, jarId: string) {
    const jar = await this.get(userId, jarId);
    const deposits = await prisma.payment.findMany({
      where: { savingsJarId: jar.id, kind: "savings_deposit", status: "successful" },
      orderBy: { createdAt: "desc" },
      take: 20,
      select: { amount: true, createdAt: true },
    });
    return { jar, deposits };
  }

  async creditJar(jarId: string, amount: number, opts: CreditJarOptions = {}) {
    if (amount <= 0) throw new BadRequestException("Amount must be greater than zero");

    if (opts.referenceId) {
      const seen = await prisma.payment.findUnique({ where: { referenceId: opts.referenceId } });
      if (seen) {
        const jar = await prisma.savingsJar.findUnique({ where: { id: jarId } });
        if (!jar) throw new NotFoundException("Savings jar not found");
        return jar;
      }
    }

    return prisma.$transaction(async (tx: TxClient) => {
      const jar = await tx.savingsJar.findUnique({ where: { id: jarId } });
      if (!jar) throw new NotFoundException("Savings jar not found");

      await tx.payment.create({
        data: {
          userId: jar.ownerUserId,
          direction: "credit",
          kind: "savings_deposit",
          amount,
          status: "successful",
          balanceAfter: null,
          savingsJarId: jar.id,
          referenceId: opts.referenceId,
          paidAt: new Date(),
        },
      });

      return tx.savingsJar.update({
        where: { id: jar.id },
        data: { currentAmount: { increment: amount } },
      });
    });
  }

  async update(
    userId: string,
    jarId: string,
    input: {
      name: string;
      icon?: string;
      accentColor?: string;
      targetAmount?: number;
      lockUntil?: Date | null;
    }
  ) {
    const jar = await this.get(userId, jarId);
    const hasDeposits = jar.currentAmount > 0;

    const data: Prisma.SavingsJarUpdateInput = { name: input.name };

    if (input.icon) data.icon = input.icon;
    if (input.accentColor) data.accentColor = input.accentColor;

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

  async remove(userId: string, jarId: string): Promise<void> {
    const jar = await this.get(userId, jarId);
    if (jar.currentAmount > 0) {
      throw new BadRequestException("Can't delete a jar that already has savings");
    }

    await prisma.pendingPayment.deleteMany({
      where: { purpose: "savings_funding", savingsJarId: jarId },
    });
    await prisma.savingsJar.delete({ where: { id: jarId } });
  }

  async depositFromWallet(userId: string, jarId: string, amount: number) {
    if (amount <= 0) throw new BadRequestException("Amount must be greater than zero");

    const jar = await this.get(userId, jarId);

    const { balance } = await ledgerService.debit(userId, "savings_deposit", amount, {
      savingsJarId: jar.id,
      referenceId: `savings_${jar.id}_${randomToken(8)}`,
    });

    const updatedJar = await prisma.savingsJar.update({
      where: { id: jar.id },
      data: { currentAmount: { increment: amount } },
    });

    return { jar: updatedJar, walletBalance: balance };
  }

  /**
   * Moves money out of a jar back into the wallet. No bank, no Nomba — a jar is an
   * internal ledger balance, so withdrawing just decrements the jar and credits the
   * wallet in one transaction. Synchronous and immediately final.
   */
  async withdrawToWallet(userId: string, jarId: string, amount: number) {
    if (amount <= 0) throw new BadRequestException("Amount must be greater than zero");

    const jar = await this.get(userId, jarId);
    if (jar.currentAmount < amount) {
      throw new BadRequestException(
        `This jar only has ₦${jar.currentAmount}, can't withdraw ₦${amount}.`
      );
    }

    const { balance } = await ledgerService.credit(userId, "savings_withdrawal", amount, {
      savingsJarId: jar.id,
      referenceId: `savings_wd_${jar.id}_${randomToken(8)}`,
    });

    const updatedJar = await prisma.savingsJar.update({
      where: { id: jar.id },
      data: { currentAmount: { decrement: amount } },
    });

    return { jar: updatedJar, walletBalance: balance };
  }
}

export const savingsService = new SavingsService();
export default savingsService;
