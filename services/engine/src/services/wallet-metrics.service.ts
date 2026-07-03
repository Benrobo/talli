import type { PaymentKind } from "@prisma/client";
import dayjs from "dayjs";
import prisma from "../prisma/index.js";
import { ledgerService } from "./ledger.service.js";

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
  activeCollection: {
    id: string;
    title: string;
    status: string;
    amountPerMember: number;
    targetAmount: number;
    collected: number;
    paidMembers: number;
    totalMembers: number;
  } | null;
  topJars: {
    id: string;
    name: string;
    saved: number;
    target: number;
  }[];
  recentTransactions: {
    id: string;
    type: "credit" | "debit";
    reason: string;
    amount: number;
    createdAt: string;
    referenceId: string | null;
  }[];
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

interface CollectionMemberPaidRow {
  paidAmount: number;
  expectedAmount: number;
}

interface ActiveCollectionRow {
  id: string;
  title: string;
  status: string;
  amountPerMember: number | null;
  targetAmount: number | null;
  createdAt: Date;
  members: CollectionMemberPaidRow[];
}

interface CollectingCollectionRow {
  id: string;
  members: { paidAmount: number }[];
}

interface TransferAmountRow {
  amount: number;
}

interface TopJarRow {
  id: string;
  name: string;
  currentAmount: number;
  targetAmount: number | null;
}

interface RecentPaymentRow {
  id: string;
  direction: "credit" | "debit";
  kind: PaymentKind;
  amount: number;
  createdAt: Date;
  referenceId: string | null;
}

const REASON_BY_KIND: Record<PaymentKind, string> = {
  savings_deposit: "savings_deposit",
  savings_withdrawal: "savings_withdrawal",
  collection_payment: "collection",
  collection_withdrawal: "collection_withdrawal",
  transfer_out: "send",
  wallet_topup: "topup",
  refund: "refund",
};

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

function sumMemberPaid(members: { paidAmount: number }[]): number {
  return members.reduce((memberSum: number, member) => {
    return memberSum + member.paidAmount;
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
  async get(userId: string): Promise<WalletMetrics> {
    const startOfThisMonth = dayjs().startOf("month").toDate();
    const startOfLastMonth = dayjs().subtract(1, "month").startOf("month").toDate();
    const endOfLastMonth = dayjs().subtract(1, "month").endOf("month").toDate();

    const [jarsNow, collecting, sentThisMonth, sentLastMonth, walletBalance] = await Promise.all([
      this.jarsTotal(userId),
      this.collectingTotals(userId, startOfThisMonth),
      this.sentTotals(userId, startOfThisMonth, null),
      this.sentTotals(userId, startOfLastMonth, endOfLastMonth),
      ledgerService.getBalance(userId),
    ]);
    const [activeCollection, topJars, recentTransactions] = await Promise.all([
      this.activeCollectionByCash(userId),
      this.topJarsByCash(userId),
      this.recentTransactions(userId),
    ]);

    const totalNow = jarsNow.amount + collecting.amount;
    const totalLastMonth = collecting.amountAtMonthStart;

    return {
      currency: "NGN",
      totalBalance: {
        amount: walletBalance,
        delta: formatPercentChange(totalNow, totalLastMonth),
      },
      savedAcrossJars: {
        amount: jarsNow.amount,
        activeJars: jarsNow.count,
        delta: null,
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
      activeCollection,
      topJars,
      recentTransactions,
    };
  }

  private async jarsTotal(userId: string): Promise<JarsTotal> {
    const jars = await prisma.savingsJar.findMany({
      where: { ownerUserId: userId, status: "active" },
      select: { currentAmount: true },
    });

    const amount = jars.reduce((sum: number, jar) => sum + jar.currentAmount, 0);
    return { amount, count: jars.length };
  }

  private async collectingTotals(userId: string, startOfThisMonth: Date): Promise<CollectingTotals> {
    const collections: CollectingCollectionRow[] = await prisma.collection.findMany({
      where: { ownerUserId: userId, status: { in: ["active", "partially_paid"] } },
      select: {
        id: true,
        members: { select: { paidAmount: true } },
      },
    });

    const collectionIds = collections.map((row: CollectingCollectionRow) => row.id);
    const amount = collections.reduce((sum: number, row: CollectingCollectionRow) => {
      return sum + sumMemberPaid(row.members);
    }, 0);

    let amountAtMonthStart = 0;
    if (collectionIds.length > 0) {
      const prior = await prisma.payment.aggregate({
        where: {
          collectionId: { in: collectionIds },
          kind: "collection_payment",
          direction: "credit",
          status: "successful",
          paidAt: { lt: startOfThisMonth },
        },
        _sum: { amount: true },
      });
      amountAtMonthStart = prior._sum.amount ?? 0;
    }

    return { amount, count: collections.length, amountAtMonthStart };
  }

  private async sentTotals(userId: string, from: Date, to: Date | null): Promise<SentTotals> {
    const createdAt = to ? { gte: from, lte: to } : { gte: from };
    const rows: TransferAmountRow[] = await prisma.transfer.findMany({
      where: { userId, status: "sent", createdAt },
      select: { amount: true },
    });

    return { amount: sumTransferAmounts(rows), count: rows.length };
  }

  private async activeCollectionByCash(userId: string): Promise<WalletMetrics["activeCollection"]> {
    const collections: ActiveCollectionRow[] = await prisma.collection.findMany({
      where: { ownerUserId: userId, status: { in: ["active", "partially_paid"] } },
      select: {
        id: true,
        title: true,
        status: true,
        amountPerMember: true,
        targetAmount: true,
        createdAt: true,
        members: { select: { paidAmount: true, expectedAmount: true } },
      },
    });
    if (collections.length === 0) return null;

    const ranked = collections
      .map((collection) => {
        const collected = sumMemberPaid(collection.members);
        const paidMembers = collection.members.filter(
          (member) => member.expectedAmount > 0 && member.paidAmount >= member.expectedAmount
        ).length;
        return {
          ...collection,
          collected,
          paidMembers,
          totalMembers: collection.members.length,
        };
      })
      .sort((a, b) => {
        if (b.collected !== a.collected) return b.collected - a.collected;
        return b.createdAt.getTime() - a.createdAt.getTime();
      });

    const top = ranked[0];
    return {
      id: top.id,
      title: top.title,
      status: top.status,
      amountPerMember: top.amountPerMember ?? 0,
      targetAmount: top.targetAmount ?? top.collected,
      collected: top.collected,
      paidMembers: top.paidMembers,
      totalMembers: top.totalMembers,
    };
  }

  private async topJarsByCash(userId: string): Promise<WalletMetrics["topJars"]> {
    const jars: TopJarRow[] = await prisma.savingsJar.findMany({
      where: { ownerUserId: userId, status: "active" },
      select: {
        id: true,
        name: true,
        currentAmount: true,
        targetAmount: true,
      },
      orderBy: [{ currentAmount: "desc" }, { createdAt: "desc" }],
      take: 2,
    });

    return jars.map((jar) => ({
      id: jar.id,
      name: jar.name,
      saved: jar.currentAmount,
      target: jar.targetAmount ?? jar.currentAmount,
    }));
  }

  private async recentTransactions(userId: string): Promise<WalletMetrics["recentTransactions"]> {
    const rows: RecentPaymentRow[] = await prisma.payment.findMany({
      where: { userId },
      select: {
        id: true,
        direction: true,
        kind: true,
        amount: true,
        createdAt: true,
        referenceId: true,
      },
      orderBy: { createdAt: "desc" },
      take: 3,
    });

    return rows.map((row) => ({
      id: row.id,
      type: row.direction,
      reason: REASON_BY_KIND[row.kind] ?? row.kind,
      amount: row.amount,
      createdAt: row.createdAt.toISOString(),
      referenceId: row.referenceId,
    }));
  }
}

export const walletMetricsService = new WalletMetricsService();
export default walletMetricsService;
