import type { Transfer, TransferStatus as TransferRowStatus } from "@prisma/client";
import dayjs from "dayjs";
import prisma from "../prisma/index.js";
import { randomToken } from "../lib/utils.js";
import { nomba } from "../integrations/nomba/index.js";
import type { Bank } from "../integrations/nomba/resources/transfers.js";
import type { TransferStatus as NombaTransferStatus } from "../integrations/nomba/types.js";
import { beneficiaryService } from "./beneficiary.service.js";
import { ledgerService } from "./ledger.service.js";
import { BadRequestException, NotFoundException } from "../lib/exception.js";
import logger from "../lib/logger.js";

const MAX_TRANSFER_POLLS = 60;

export interface ResolveRecipientResult {
  found: boolean;
  accountName?: string;
  accountNumber?: string;
  bankCode?: string;
  bankName?: string;
}

export interface PayoutInput {
  userId: string;
  amount: number;
  accountNumber: string;
  bankName: string;
  senderName: string;
  alias?: string;
  narration?: string;
  createdByPlatformUserId?: string;
}

export interface PayoutResult {
  status: "sent" | "pending" | "failed";
  accountName: string;
  accountNumber: string;
  bankName: string;
  amount: number;
  transferRef: string;
  walletBalance: number;
}

export interface SentLedgerRow {
  id: string;
  recipient: string;
  meta: string;
  typed: string;
  date: string;
  amountMinor: number;
}

export interface SentLedgerSummary {
  sentThisMonthMinor: number;
  monthLabel: string;
  transferCount: number;
  recipientCount: number;
}

/**
 * Send Mode — bank transfers over the Nomba SDK, parse-and-confirm. Resolves a
 * recipient from the phone book (or a fresh bank lookup), executes the transfer,
 * and saves the recipient for next time. Only ever called from a private DM; the
 * dispatcher enforces that.
 */
class TransferService {
  /** Resolves a chat alias to verified account details via the phone book. */
  async resolveRecipient(userId: string, alias: string): Promise<ResolveRecipientResult> {
    const saved = await beneficiaryService.findByAlias(userId, alias);
    if (!saved) return { found: false };
    return {
      found: true,
      accountName: saved.accountName,
      accountNumber: saved.accountNumber,
      bankCode: saved.bankCode,
      bankName: saved.bankName ?? undefined,
    };
  }

  /** Verifies fresh account details against Nomba before they're shown/saved. */
  async lookupAccount(accountNumber: string, bankCode: string): Promise<string> {
    const { accountName } = await nomba.transfers.lookupAccount({ accountNumber, bankCode });
    if (!accountName) throw new NotFoundException("Could not verify that account");
    return accountName;
  }

  /**
   * Matches a free-text bank name ("zenith", "gtb") to a Nomba bank. Prefers an
   * exact name, then a name starting with the term, then any name containing it —
   * so "zenith" picks "Zenith Bank" over "Zenith Eazy Wallet". Returns null when
   * nothing matches.
   */
  async resolveBank(name: string): Promise<Bank | null> {
    const term = name.trim().toLowerCase();
    if (!term) return null;
    const banks = await nomba.transfers.listBanks();

    return (
      banks.find((b) => b.name.toLowerCase() === term) ??
      banks.find((b) => b.name.toLowerCase().startsWith(term)) ??
      banks.find((b) => b.name.toLowerCase().includes(term)) ??
      null
    );
  }

  /**
   * Verifies a destination the user typed (account number + a bank name) against
   * Nomba: resolves the bank, then looks up the real account-holder name. Returns
   * the verified details to show on the confirm card, or a reason it failed so
   * the dispatcher can ask again. Never throws for the expected failures.
   */
  async verifyDestination(
    accountNumber: string,
    bankName: string
  ): Promise<
    | { ok: true; accountName: string; accountNumber: string; bankCode: string; bankName: string }
    | { ok: false; reason: "bank_unknown" | "account_unverified" }
  > {
    const bank = await this.resolveBank(bankName);
    if (!bank) return { ok: false, reason: "bank_unknown" };

    try {
      const { accountName } = await nomba.transfers.lookupAccount({
        accountNumber,
        bankCode: bank.code,
      });
      if (!accountName) return { ok: false, reason: "account_unverified" };
      return { ok: true, accountName, accountNumber, bankCode: bank.code, bankName: bank.name };
    } catch {
      return { ok: false, reason: "account_unverified" };
    }
  }

  async listBanks() {
    return nomba.transfers.listBanks();
  }

  /**
   * The full guarded payout: verify the destination against Nomba, debit the
   * wallet, send to the bank, and refund the wallet if the send throws. The one
   * place that moves money out — shared by the Telegram dispatcher and the REST
   * API so the debit/refund rules can't drift between them. Throws a
   * BadRequestException on an unusable destination or insufficient balance
   * BEFORE any debit; only a post-debit Nomba failure triggers a refund.
   */
  async payout(input: PayoutInput): Promise<PayoutResult> {
    const verified = await this.verifyDestination(input.accountNumber, input.bankName);
    if (!verified.ok) {
      throw new BadRequestException(
        verified.reason === "bank_unknown"
          ? `Couldn't find a bank matching "${input.bankName}".`
          : `Couldn't verify ${input.accountNumber} at ${input.bankName}.`
      );
    }

    const balance = await ledgerService.getBalance(input.userId);
    if (balance < input.amount) {
      throw new BadRequestException(
        `Insufficient balance: have ₦${balance}, need ₦${input.amount}.`
      );
    }

    const merchantTxRef = `talli_send_${randomToken(10)}`;
    console.log(`💸 [payout] start ref=${merchantTxRef}`, {
      amount: input.amount,
      to: `${verified.accountName} · ${verified.accountNumber} · ${verified.bankName}`,
      bankCode: verified.bankCode,
      user: input.userId,
    });

    await ledgerService.debit(input.userId, "transfer_out", input.amount, {
      referenceId: merchantTxRef,
    });
    console.log(`📉 [payout] wallet debited ref=${merchantTxRef}`, {
      amount: input.amount,
      balanceAfter: balance - input.amount,
    });

    const base = {
      accountName: verified.accountName,
      accountNumber: verified.accountNumber,
      bankName: verified.bankName,
      amount: input.amount,
      transferRef: merchantTxRef,
    };

    let nombaStatus: NombaTransferStatus | undefined;
    let nombaTxId: string | undefined;
    let failureReason: string | undefined;

    try {
      const result = await nomba.transfers.toBank({
        amount: input.amount,
        accountNumber: verified.accountNumber,
        accountName: verified.accountName,
        bankCode: verified.bankCode,
        senderName: input.senderName,
        merchantTxRef,
        narration: input.narration,
      });
      nombaStatus = result.status as NombaTransferStatus;
      nombaTxId = result.id;
      console.log(`🏦 [payout] nomba responded ref=${merchantTxRef}`, {
        result,
        nombaStatus,
        nombaTxId,
      });
    } catch (err) {
      failureReason = (err as Error).message;
      console.error(`❌ [payout] nomba send threw ref=${merchantTxRef}`, { reason: failureReason });
      logger.error(`[transfer] send threw for ${merchantTxRef}: ${failureReason}`);
    }

    const status = this.mapStatus(nombaStatus, !!failureReason);

    if (status === "failed") {
      await ledgerService.credit(input.userId, "refund", input.amount, {
        referenceId: `${merchantTxRef}_refund`,
      });
      console.log(`↩️ [payout] refunded wallet (send failed) ref=${merchantTxRef}`, {
        amount: input.amount,
      });
    } else if (input.alias) {
      await beneficiaryService.save({
        userId: input.userId,
        alias: input.alias,
        accountName: verified.accountName,
        accountNumber: verified.accountNumber,
        bankCode: verified.bankCode,
        bankName: verified.bankName,
        createdByPlatformUserId: input.createdByPlatformUserId,
      });
    }

    await prisma.transfer.create({
      data: {
        userId: input.userId,
        merchantTxRef,
        nombaTxId,
        walletRef: merchantTxRef,
        amount: input.amount,
        accountNumber: verified.accountNumber,
        accountName: verified.accountName,
        bankCode: verified.bankCode,
        bankName: verified.bankName,
        narration: input.narration,
        senderName: input.senderName,
        createdByPlatformUserId: input.createdByPlatformUserId,
        status,
        failureReason,
        completedAt: status === "pending" ? null : new Date(),
      },
    });

    const icon = status === "sent" ? "✅" : status === "pending" ? "⏳" : "🚫";
    console.log(`${icon} [payout] recorded ref=${merchantTxRef}`, {
      status,
      nombaStatus: nombaStatus ?? "none",
      amount: input.amount,
    });

    return { ...base, status, walletBalance: await ledgerService.getBalance(input.userId) };
  }

  /**
   * Maps Nomba's transfer status to our terminal/pending state. A SUCCESS lands
   * immediately; a REFUND / PAYMENT_FAILED (or a thrown request) is failed; every
   * other value (NEW, PENDING_BILLING, or an unknown one — "when in doubt, treat
   * as pending") stays pending for the reconcile cron to finalise.
   */
  private mapStatus(status: NombaTransferStatus | undefined, threw: boolean): TransferRowStatus {
    if (threw) return "failed";
    if (status === "SUCCESS" || status === "PAYMENT_SUCCESSFUL") return "sent";
    if (status === "REFUND" || status === "PAYMENT_FAILED") return "failed";
    return "pending";
  }

  /** Pending transfers due for a requery, oldest first, under the attempt cap. */
  async listPendingTransfers(limit = 50): Promise<Transfer[]> {
    return prisma.transfer.findMany({
      where: { status: "pending", pollAttempts: { lt: MAX_TRANSFER_POLLS } },
      orderBy: { createdAt: "asc" },
      take: limit,
    });
  }

  /**
   * Requeries one pending transfer and settles it. SUCCESS -> sent. REFUND/failed
   * -> credit the wallet back (idempotent on the ref) and mark failed. Otherwise
   * bump the attempt counter and leave it pending. Returns the now-terminal
   * transfer (for the caller to notify), or null while it's still pending.
   */
  async reconcileTransfer(transferId: string): Promise<Transfer | null> {
    const transfer = await prisma.transfer.findUnique({ where: { id: transferId } });
    if (!transfer) return null;
    if (transfer.status !== "pending") return transfer;

    let status: NombaTransferStatus | undefined;
    try {
      const fresh = await nomba.transfers.requery(transfer.merchantTxRef);
      status = fresh.status as NombaTransferStatus;
    } catch (err) {
      logger.warn(`[transfer] requery ${transfer.merchantTxRef} failed: ${(err as Error).message}`);
    }

    if (status === "SUCCESS" || status === "PAYMENT_SUCCESSFUL") {
      console.log(`✅ [transfer] settled SENT ref=${transfer.merchantTxRef}`, {
        amount: transfer.amount,
        to: transfer.accountName,
        attempts: transfer.pollAttempts,
      });
      return prisma.transfer.update({
        where: { id: transfer.id },
        data: { status: "sent", completedAt: new Date() },
      });
    }

    if (status === "REFUND" || status === "PAYMENT_FAILED") {
      await ledgerService.credit(transfer.userId, "refund", transfer.amount, {
        referenceId: `${transfer.walletRef}_refund`,
      });
      console.log(`↩️ [transfer] settled REFUND, wallet credited back ref=${transfer.merchantTxRef}`, {
        amount: transfer.amount,
        to: transfer.accountName,
        attempts: transfer.pollAttempts,
      });
      return prisma.transfer.update({
        where: { id: transfer.id },
        data: { status: "failed", failureReason: "refunded by Nomba", completedAt: new Date() },
      });
    }

    await prisma.transfer.update({
      where: { id: transfer.id },
      data: { pollAttempts: { increment: 1 } },
    });
    const attempt = transfer.pollAttempts + 1;
    if (attempt === 1 || attempt % 6 === 0) {
      console.log(`🔄 [transfer] still pending ref=${transfer.merchantTxRef}`, {
        nombaStatus: status ?? "unknown",
        attempt,
      });
    }
    return null;
  }

  /** Outbound transfer history for a user — the receipt source. */
  async history(userId: string, limit = 50): Promise<Transfer[]> {
    return prisma.transfer.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
      take: limit,
    });
  }

  /**
   * Paginated outbound send ledger for the money-sent screen. Reads successful
   * transfers only, newest first, with roll-up stats for the header cards.
   */
  async listSentLedger(
    userId: string,
    options: { page: number; pageSize: number }
  ): Promise<{
    payments: SentLedgerRow[];
    summary: SentLedgerSummary;
    total: number;
    page: number;
    pageSize: number;
  }> {
    const page = Math.max(1, options.page);
    const pageSize = Math.min(100, Math.max(1, options.pageSize));
    const where = { userId, status: "sent" as const };
    const startOfMonth = dayjs().startOf("month").toDate();

    const [transfers, total, sentThisMonth, allRecipients] = await Promise.all([
      prisma.transfer.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      prisma.transfer.count({ where }),
      prisma.transfer.aggregate({
        where: { ...where, createdAt: { gte: startOfMonth } },
        _sum: { amount: true },
      }),
      prisma.transfer.findMany({
        where,
        select: { accountNumber: true },
      }),
    ]);

    return {
      payments: transfers.map((transfer) => this.toSentLedgerRow(transfer)),
      summary: {
        sentThisMonthMinor: sentThisMonth._sum.amount ?? 0,
        monthLabel: dayjs().format("MMMM"),
        transferCount: total,
        recipientCount: new Set(allRecipients.map((row) => row.accountNumber)).size,
      },
      total,
      page,
      pageSize,
    };
  }

  private toSentLedgerRow(transfer: Transfer): SentLedgerRow {
    const bank = transfer.bankName ?? "Bank";
    const note = transfer.narration?.trim() || "transfer";
    return {
      id: transfer.id,
      recipient: this.shortRecipientName(transfer.accountName),
      meta: `${bank} · ${note}`,
      typed: transfer.narration?.trim() ? `"${transfer.narration.trim()}"` : "—",
      date: this.formatLedgerDate(transfer.createdAt),
      amountMinor: transfer.amount,
    };
  }

  private shortRecipientName(name: string): string {
    const parts = name.trim().split(/\s+/).filter(Boolean);
    if (parts.length <= 1) return parts[0] ?? name;
    return `${parts[0]} ${parts[parts.length - 1]![0]}.`;
  }

  private formatLedgerDate(value: Date): string {
    const date = dayjs(value);
    if (date.isSame(dayjs(), "day")) return "Today";
    return date.format("MMM D");
  }
}

export const transferService = new TransferService();
export default transferService;
