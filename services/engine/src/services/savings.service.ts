import type { SavingsJar } from "@prisma/client";
import prisma from "../prisma/index.js";
import { NotFoundException } from "../lib/exception.js";

export interface CreateJarInput {
  name: string;
  targetAmount?: number;
}

/**
 * Savings jars — personal money a user sets aside. Owns jar creation, lookup by
 * name (for chat commands), and crediting. Funding is a wallet debit + jar
 * credit (the dispatcher does both); `creditJar` records the deposit.
 */
class SavingsService {
  async createJar(workspaceId: string, userId: string, input: CreateJarInput): Promise<SavingsJar> {
    return prisma.savingsJar.create({
      data: {
        workspaceId,
        ownerUserId: userId,
        name: input.name,
        targetAmount: input.targetAmount,
        status: "active",
      },
    });
  }

  async findByName(workspaceId: string, name: string): Promise<SavingsJar | null> {
    return prisma.savingsJar.findFirst({
      where: { workspaceId, name: { equals: name.trim(), mode: "insensitive" }, status: "active" },
    });
  }

  async list(workspaceId: string): Promise<SavingsJar[]> {
    return prisma.savingsJar.findMany({
      where: { workspaceId, status: "active" },
      orderBy: { createdAt: "desc" },
    });
  }

  /** Credits a jar from a settled funding payment. Atomic; records the deposit. */
  async creditJar(jarId: string, amount: number, paymentId?: string): Promise<SavingsJar> {
    return prisma.$transaction(async (tx) => {
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
}

export const savingsService = new SavingsService();
export default savingsService;
