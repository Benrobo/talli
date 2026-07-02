import prisma from "../prisma/index.js";
import { NotFoundException } from "../lib/exception.js";

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
}

export const savingsService = new SavingsService();
export default savingsService;
