import dayjs from "dayjs";
import prisma from "../prisma/index.js";

export interface MetricDelta {
  value: string;
  direction: "up" | "down";
}

export interface WalletMetrics {
  currency: string;
  totalBalance: {
    amount: number;
    delta: MetricDelta | null;
  };
  savedAcrossJars: {
    amount: number;
    activeJars: number;
    delta: MetricDelta | null;
  };
  collectingNow: {
    amount: number;
    collectionsCount: number;
    delta: MetricDelta | null;
  };
  sentThisMonth: {
    amount: number;
    transfersCount: number;
    delta: MetricDelta | null;
  };
}

interface JarsTotal {
  amount: number;
  count: number;
}

interface CollectingTotals {
  amount: number;
  count: number;
  amountAtMonthStart: number;
}

interface SentTotals {
  amount: number;
  count: number;
}

interface JarBalanceRow {
  currentAmount: number;
}

interface JarIdRow {
  id: string;
}

interface SavingsLedgerRow {
  amount: number;
  type: "deposit" | "withdrawal" | "adjustment";
}

interface CollectionMemberPaidRow {
  paidAmount: number;
}

interface ActiveCollectionRow {
  id: string;
  members: CollectionMemberPaidRow[];
}

interface TransferAmountRow {
  amount: number;
}

function formatPercentChange(current: number, previous: number): MetricDelta | null {
  if (previous === 0) {
    if (current === 0) return null;
    return { value: "+100%", direction: "up" };
  }

  const raw = ((current - previous) / previous) * 100;
  const rounded = Math.round(raw * 10) / 10;
  if (rounded === 0) return null;

  const direction = rounded >= 0 ? "up" : "down";
  const abs = Math.abs(rounded);
  const formatted = abs % 1 === 0 ? abs.toFixed(0) : abs.toFixed(1);
  return { value: `${rounded >= 0 ? "+" : "-"}${formatted}%`, direction };
}

function sumMemberPaid(members: CollectionMemberPaidRow[]): number {
  return members.reduce((memberSum: number, member: CollectionMemberPaidRow) => {
    return memberSum + member.paidAmount;
  }, 0);
}

function sumSavingsLedger(txs: SavingsLedgerRow[]): number {
  return txs.reduce((sum: number, tx: SavingsLedgerRow) => {
    if (tx.type === "withdrawal") return sum - tx.amount;
    return sum + tx.amount;
  }, 0);
}

function sumTransferAmounts(rows: TransferAmountRow[]): number {
  return rows.reduce((sum: number, row: TransferAmountRow) => sum + row.amount, 0);
}

/**
 * Dashboard wallet metrics — jars saved, live collection totals, monthly sends,
 * and month-over-month deltas. `totalBalance` is jars + collecting (money in
 * motion), not the Nomba-funded wallet float.
 */
class WalletMetricsService {
  async get(userId: string, workspaceId: string): Promise<WalletMetrics> {
    const startOfThisMonth = dayjs().startOf("month").toDate();
    const startOfLastMonth = dayjs().subtract(1, "month").startOf("month").toDate();
    const endOfLastMonth = dayjs().subtract(1, "month").endOf("month").toDate();

    const [jarsNow, jarsLastMonth, collecting, sentThisMonth, sentLastMonth, currency] =
      await Promise.all([
        this.jarsTotal(userId, workspaceId),
        this.jarsTotalAt(userId, workspaceId, endOfLastMonth),
        this.collectingTotals(workspaceId, startOfThisMonth),
        this.sentTotals(workspaceId, startOfThisMonth, null),
        this.sentTotals(workspaceId, startOfLastMonth, endOfLastMonth),
        this.workspaceCurrency(workspaceId),
      ]);

    const totalNow = jarsNow.amount + collecting.amount;
    const totalLastMonth = jarsLastMonth + collecting.amountAtMonthStart;

    return {
      currency,
      totalBalance: {
        amount: totalNow,
        delta: formatPercentChange(totalNow, totalLastMonth),
      },
      savedAcrossJars: {
        amount: jarsNow.amount,
        activeJars: jarsNow.count,
        delta: formatPercentChange(jarsNow.amount, jarsLastMonth),
      },
      collectingNow: {
        amount: collecting.amount,
        collectionsCount: collecting.count,
        delta: formatPercentChange(collecting.amount, collecting.amountAtMonthStart),
      },
      sentThisMonth: {
        amount: sentThisMonth.amount,
        transfersCount: sentThisMonth.count,
        delta: formatPercentChange(sentThisMonth.amount, sentLastMonth.amount),
      },
    };
  }

  private async workspaceCurrency(workspaceId: string): Promise<string> {
    const workspace = await prisma.workspace.findUnique({
      where: { id: workspaceId },
      select: { currency: true },
    });
    return workspace?.currency ?? "NGN";
  }

  private async jarsTotal(userId: string, workspaceId: string): Promise<JarsTotal> {
    const jars: JarBalanceRow[] = await prisma.savingsJar.findMany({
      where: { workspaceId, ownerUserId: userId, status: "active" },
      select: { currentAmount: true },
    });

    const amount = jars.reduce((sum: number, jar: JarBalanceRow) => sum + jar.currentAmount, 0);
    return { amount, count: jars.length };
  }

  private async jarsTotalAt(userId: string, workspaceId: string, asOf: Date): Promise<number> {
    const jars: JarIdRow[] = await prisma.savingsJar.findMany({
      where: { workspaceId, ownerUserId: userId, status: "active" },
      select: { id: true },
    });

    const jarIds = jars.map((jar: JarIdRow) => jar.id);
    if (jarIds.length === 0) return 0;

    const txs: SavingsLedgerRow[] = await prisma.savingsTransaction.findMany({
      where: {
        savingsJarId: { in: jarIds },
        status: "completed",
        createdAt: { lte: asOf },
      },
      select: { amount: true, type: true },
    });

    return sumSavingsLedger(txs);
  }

  private async collectingTotals(
    workspaceId: string,
    startOfThisMonth: Date
  ): Promise<CollectingTotals> {
    const collections: ActiveCollectionRow[] = await prisma.collection.findMany({
      where: { workspaceId, status: { in: ["active", "partially_paid"] } },
      select: {
        id: true,
        members: { select: { paidAmount: true } },
      },
    });

    const collectionIds = collections.map((row: ActiveCollectionRow) => row.id);
    const amount = collections.reduce((sum: number, row: ActiveCollectionRow) => {
      return sum + sumMemberPaid(row.members);
    }, 0);

    let amountAtMonthStart = 0;
    if (collectionIds.length > 0) {
      const prior = await prisma.payment.aggregate({
        where: {
          collectionId: { in: collectionIds },
          status: "successful",
          paidAt: { lt: startOfThisMonth },
        },
        _sum: { amount: true },
      });
      amountAtMonthStart = prior._sum.amount ?? 0;
    }

    return { amount, count: collections.length, amountAtMonthStart };
  }

  private async sentTotals(workspaceId: string, from: Date, to: Date | null): Promise<SentTotals> {
    const createdAt = to ? { gte: from, lte: to } : { gte: from };
    const rows: TransferAmountRow[] = await prisma.transfer.findMany({
      where: { workspaceId, status: "sent", createdAt },
      select: { amount: true },
    });

    return { amount: sumTransferAmounts(rows), count: rows.length };
  }
}

export const walletMetricsService = new WalletMetricsService();
export default walletMetricsService;
