import dayjs from "dayjs";
import prisma from "../prisma/index.js";
import { walletService } from "./wallet.service.js";

export interface JarSummary {
  name: string;
  currentAmount: number;
  targetAmount: number | null;
}

export interface CollectionSummary {
  title: string;
  status: string;
  amountPerMember: number | null;
  targetAmount: number | null;
  deadline: string | null;
  collected: number;
  paidCount: number;
  enrolledCount: number;
}

export interface FinancialOverview {
  walletBalance: number;
  currency: string;
  jars: JarSummary[];
  jarsTotal: number;
  collections: CollectionSummary[];
}

/**
 * Read-only financial overview for a user — wallet balance, savings jars, and
 * active collections — aggregated for the `/balance` command. Pure reads; no
 * money moves here.
 */
class BalanceService {
  async overview(userId: string, workspaceId: string): Promise<FinancialOverview> {
    const wallet = await walletService.ensureWallet(userId);

    const jars = await prisma.savingsJar.findMany({
      where: { workspaceId, ownerUserId: userId, status: "active" },
      orderBy: { createdAt: "desc" },
    });

    const collections = await prisma.collection.findMany({
      where: { workspaceId, status: { in: ["active", "partially_paid"] } },
      orderBy: { createdAt: "desc" },
      include: { members: { select: { paidAmount: true, expectedAmount: true } } },
    });

    return {
      walletBalance: wallet.balance,
      currency: wallet.currency,
      jars: jars.map((j) => ({
        name: j.name,
        currentAmount: j.currentAmount,
        targetAmount: j.targetAmount,
      })),
      jarsTotal: jars.reduce((sum, j) => sum + j.currentAmount, 0),
      collections: collections.map((c) => {
        const collected = c.members.reduce((s, m) => s + m.paidAmount, 0);
        const paidCount = c.members.filter((m) => m.paidAmount >= m.expectedAmount && m.expectedAmount > 0).length;
        return {
          title: c.title,
          status: c.status,
          amountPerMember: c.amountPerMember,
          targetAmount: c.targetAmount,
          deadline: c.deadline ? dayjs(c.deadline).format("YYYY-MM-DD") : null,
          collected,
          paidCount,
          enrolledCount: c.members.length,
        };
      }),
    };
  }
}

export const balanceService = new BalanceService();
export default balanceService;
