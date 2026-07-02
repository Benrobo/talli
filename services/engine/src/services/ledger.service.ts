import type { Payment, PaymentDirection, PaymentKind, PaymentStatus } from "@prisma/client";
import prisma from "../prisma/index.js";
import { BadRequestException, NotFoundException } from "../lib/exception.js";

type TxClient = Parameters<typeof prisma.$transaction>[0] extends (
  tx: infer T
) => Promise<unknown>
  ? T
  : never;

export interface ApplyEntryInput {
  userId: string;
  direction: PaymentDirection;
  kind: PaymentKind;
  amount: number;
  status?: PaymentStatus;
  referenceId?: string;
  providerOrderId?: string;
  providerReference?: string;
  savingsJarId?: string;
  collectionId?: string;
  collectionMemberId?: string;
  transferId?: string;
  payerUserId?: string;
  payerPlatformId?: string;
  paidAt?: Date;
}

export interface ApplyEntryResult {
  payment: Payment;
  balance: number;
  duplicate: boolean;
}

class LedgerService {
  async getBalance(userId: string): Promise<number> {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { walletBalance: true },
    });
    if (!user) throw new NotFoundException("User not found");
    return user.walletBalance;
  }

  async history(userId: string, limit = 50): Promise<Payment[]> {
    return prisma.payment.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
      take: limit,
    });
  }

  async listHistory(
    userId: string,
    filters: {
      page?: number;
      pageSize?: number;
      type?: string;
      status?: PaymentStatus;
      dateFrom?: Date;
      dateTo?: Date;
      search?: string;
    } = {}
  ): Promise<{ items: Payment[]; total: number; page: number; pageSize: number }> {
    const page = Math.max(1, filters.page ?? 1);
    const pageSize = Math.min(100, Math.max(1, filters.pageSize ?? 20));

    const where = this.buildWhere(userId, filters);

    const [items, total] = await Promise.all([
      prisma.payment.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      prisma.payment.count({ where }),
    ]);

    return { items, total, page, pageSize };
  }

  async summary(
    userId: string,
    range: { dateFrom?: Date; dateTo?: Date } = {}
  ): Promise<{ moneyIn: number; moneyOut: number; net: number }> {
    const createdAt = this.dateWindow(range);
    const [inAgg, outAgg] = await Promise.all([
      prisma.payment.aggregate({
        where: { userId, direction: "credit", status: "successful", ...(createdAt ? { createdAt } : {}) },
        _sum: { amount: true },
      }),
      prisma.payment.aggregate({
        where: { userId, direction: "debit", status: "successful", ...(createdAt ? { createdAt } : {}) },
        _sum: { amount: true },
      }),
    ]);
    const moneyIn = inAgg._sum.amount ?? 0;
    const moneyOut = outAgg._sum.amount ?? 0;
    return { moneyIn, moneyOut, net: moneyIn - moneyOut };
  }

  async counts(
    userId: string,
    filters: { status?: PaymentStatus; dateFrom?: Date; dateTo?: Date; search?: string } = {}
  ): Promise<Record<string, number>> {
    const types = ["all", "in", "out", "sent", "saved", "topup", "collection", "refund"];
    const entries = await Promise.all(
      types.map(async (type) => {
        const where = this.buildWhere(userId, { ...filters, type: type === "all" ? undefined : type });
        return [type, await prisma.payment.count({ where })] as const;
      })
    );
    return Object.fromEntries(entries);
  }

  private buildWhere(
    userId: string,
    filters: { type?: string; status?: PaymentStatus; dateFrom?: Date; dateTo?: Date; search?: string }
  ) {
    const where: Record<string, unknown> = { userId };

    switch (filters.type) {
      case "in":
        where.direction = "credit";
        break;
      case "out":
        where.direction = "debit";
        break;
      case "sent":
        where.kind = "transfer_out";
        break;
      case "saved":
        where.kind = { in: ["savings_deposit", "savings_withdrawal"] };
        break;
      case "topup":
        where.kind = "wallet_topup";
        break;
      case "collection":
        where.kind = "collection_payment";
        break;
      case "refund":
        where.kind = "refund";
        break;
      default:
        break;
    }

    if (filters.status) where.status = filters.status;

    const createdAt = this.dateWindow(filters);
    if (createdAt) where.createdAt = createdAt;

    const search = filters.search?.trim();
    if (search) {
      const asAmount = Number(search.replace(/[^\d]/g, ""));
      where.OR = [
        { referenceId: { contains: search, mode: "insensitive" } },
        { providerReference: { contains: search, mode: "insensitive" } },
        ...(Number.isFinite(asAmount) && asAmount > 0 ? [{ amount: asAmount }] : []),
      ];
    }

    return where;
  }

  private dateWindow(range: { dateFrom?: Date; dateTo?: Date }) {
    if (!range.dateFrom && !range.dateTo) return null;
    return {
      ...(range.dateFrom ? { gte: range.dateFrom } : {}),
      ...(range.dateTo ? { lte: range.dateTo } : {}),
    };
  }

  async applyEntry(input: ApplyEntryInput): Promise<ApplyEntryResult> {
    if (input.amount <= 0) throw new BadRequestException("Amount must be greater than zero");

    if (input.referenceId) {
      const seen = await prisma.payment.findUnique({ where: { referenceId: input.referenceId } });

      console.log(`🔴 Ledger Seen: ${JSON.stringify(seen, null, 2)}`);

      if (seen) return { payment: seen, balance: seen.balanceAfter ?? 0, duplicate: true };
    }

    try {
      return await prisma.$transaction(async (tx: TxClient) => {
        const user = await tx.user.findUnique({
          where: { id: input.userId },
          select: { walletBalance: true },
        });
        if (!user) throw new NotFoundException("User not found");

        const delta = input.direction === "credit" ? input.amount : -input.amount;
        const balanceAfter = user.walletBalance + delta;
        if (balanceAfter < 0) throw new BadRequestException("Insufficient balance");

        const payment = await tx.payment.create({
          data: {
            userId: input.userId,
            direction: input.direction,
            kind: input.kind,
            amount: input.amount,
            status: input.status ?? "successful",
            balanceAfter,
            referenceId: input.referenceId,
            providerOrderId: input.providerOrderId,
            providerReference: input.providerReference,
            savingsJarId: input.savingsJarId,
            collectionId: input.collectionId,
            collectionMemberId: input.collectionMemberId,
            transferId: input.transferId,
            payerUserId: input.payerUserId,
            payerPlatformId: input.payerPlatformId,
            paidAt: input.paidAt ?? new Date(),
          },
        });

        await tx.user.update({
          where: { id: input.userId },
          data: { walletBalance: balanceAfter },
        });

        console.log(`✅ Ledger Applied: ${JSON.stringify(payment, null, 2)}`);

        return { payment, balance: balanceAfter, duplicate: false };
      });
    } catch (err) {
      if ((err as { code?: string }).code === "P2002" && input.referenceId) {
        const existing = await prisma.payment.findUnique({
          where: { referenceId: input.referenceId },
        });
        if (existing) return { payment: existing, balance: existing.balanceAfter ?? 0, duplicate: true };
      }
      console.log(`🔴 Ledger Error: ${JSON.stringify(err, null, 2)}`);
      throw err;
    }
  }

  async credit(
    userId: string,
    kind: PaymentKind,
    amount: number,
    opts: Omit<ApplyEntryInput, "userId" | "direction" | "kind" | "amount"> = {}
  ): Promise<ApplyEntryResult> {
    console.log(`🔄 Ledger Crediting ${amount} to ${userId} for ${kind}`);
    return this.applyEntry({ userId, direction: "credit", kind, amount, ...opts });
  }

  async debit(
    userId: string,
    kind: PaymentKind,
    amount: number,
    opts: Omit<ApplyEntryInput, "userId" | "direction" | "kind" | "amount"> = {}
  ): Promise<ApplyEntryResult> {
    console.log(`🔄 Ledger Debiting ${amount} from ${userId} for ${kind}`);
    return this.applyEntry({ userId, direction: "debit", kind, amount, ...opts });
  }
}

export const ledgerService = new LedgerService();
export default ledgerService;
