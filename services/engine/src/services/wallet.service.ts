import type {
  Wallet,
  WalletTransaction,
  WalletTransactionType,
  WalletTransactionReason,
} from "@prisma/client";
import prisma from "../prisma/index.js";
import { pendingPaymentService, type CreatedPending } from "./pending-payment.service.js";
import { BadRequestException, NotFoundException } from "../lib/exception.js";

export type LedgerReason = WalletTransactionReason;

export interface ApplyEntryInput {
  walletId: string;
  type: WalletTransactionType;
  amount: number;
  reason: LedgerReason;
  referenceId?: string;
}

export interface ApplyEntryResult {
  wallet: Wallet;
  transaction: WalletTransaction;
  duplicate: boolean;
}

/**
 * The internal wallet ledger. `wallets.balance` is a cache of the
 * `wallet_transactions` ledger; `applyEntry` is the ONLY way a balance changes —
 * it writes the ledger row and updates the cached balance in one transaction,
 * dedupes on `referenceId`, and never lets a debit drive the balance negative.
 * Nothing else may touch `wallets.balance` directly.
 */
class WalletService {
  async ensureWallet(userId: string): Promise<Wallet> {
    return prisma.wallet.upsert({
      where: { userId },
      create: { userId },
      update: {},
    });
  }

  async getByUser(userId: string): Promise<Wallet | null> {
    return prisma.wallet.findUnique({ where: { userId } });
  }

  async getBalance(userId: string): Promise<number> {
    const wallet = await prisma.wallet.findUnique({ where: { userId }, select: { balance: true } });
    if (!wallet) throw new NotFoundException("Wallet not found");
    return wallet.balance;
  }

  async history(walletId: string, limit = 50): Promise<WalletTransaction[]> {
    return prisma.walletTransaction.findMany({
      where: { walletId },
      orderBy: { createdAt: "desc" },
      take: limit,
    });
  }

  /**
   * Starts a top-up: issues a flash account number for the user to transfer into.
   * The polling cron reconciles the transfer and credits the wallet ledger.
   */
  async startTopUp(userId: string, amount: number, customerEmail?: string): Promise<CreatedPending> {
    if (amount <= 0) throw new BadRequestException("Amount must be greater than zero");

    const wallet = await this.ensureWallet(userId);
    const user = await prisma.user.findUnique({ where: { id: userId }, select: { email: true } });

    return pendingPaymentService.create({
      purpose: "topup",
      amount,
      walletId: wallet.id,
      customerEmail: customerEmail ?? user?.email,
    });
  }

  async applyEntry(input: ApplyEntryInput): Promise<ApplyEntryResult> {
    if (input.amount <= 0) throw new BadRequestException("Amount must be greater than zero");

    if (input.referenceId) {
      const seen = await prisma.walletTransaction.findUnique({
        where: { referenceId: input.referenceId },
        include: { wallet: true },
      });
      if (seen) return { wallet: seen.wallet, transaction: seen, duplicate: true };
    }

    try {
      return await prisma.$transaction(async (tx) => {
        const wallet = await tx.wallet.findUnique({ where: { id: input.walletId } });
        if (!wallet) throw new NotFoundException("Wallet not found");

        const delta = input.type === "credit" ? input.amount : -input.amount;
        const balanceAfter = wallet.balance + delta;
        if (balanceAfter < 0) throw new BadRequestException("Insufficient balance");

        const transaction = await tx.walletTransaction.create({
          data: {
            walletId: input.walletId,
            type: input.type,
            amount: input.amount,
            reason: input.reason,
            referenceId: input.referenceId,

            // calculate the balance on a db level
            balanceAfter: wallet.balance + delta,
          },
        });

        const updated = await tx.wallet.update({
          where: { id: input.walletId },
          data: { balance: wallet.balance + delta },
        });

        console.log(`✅ Wallet ${input.walletId} balance updated to ${updated.balance}`);

        return { wallet: updated, transaction, duplicate: false };
      });
    } catch (err) {
      if ((err as { code?: string }).code === "P2002" && input.referenceId) {
        const existing = await prisma.walletTransaction.findUnique({
          where: { referenceId: input.referenceId },
          include: { wallet: true },
        });
        if (existing) return { wallet: existing.wallet, transaction: existing, duplicate: true };
      }
      throw err;
    }
  }

  async credit(walletId: string, amount: number, reason: LedgerReason, referenceId?: string) {
    return this.applyEntry({ walletId, type: "credit", amount, reason, referenceId });
  }

  async debit(walletId: string, amount: number, reason: LedgerReason, referenceId?: string) {
    return this.applyEntry({ walletId, type: "debit", amount, reason, referenceId });
  }
}

export const walletService = new WalletService();
export default walletService;
