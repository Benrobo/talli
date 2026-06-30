import dayjs from "dayjs";
import type { PendingPayment, PendingPaymentPurpose, Payment } from "@prisma/client";
import prisma from "../prisma/index.js";
import env from "../config/env.js";
import { randomToken } from "../lib/utils.js";
import { nomba } from "../integrations/nomba/index.js";
import { telegram } from "../integrations/telegram/bot.js";
import { messages } from "../integrations/telegram/ui/messages.js";
import { walletService } from "./wallet.service.js";
import { collectionService } from "./collection.service.js";
import { receiptService } from "./receipt/index.js";
import logger from "../lib/logger.js";
import { BadRequestException, NotFoundException } from "../lib/exception.js";

export type PendingPurpose = PendingPaymentPurpose;

export interface CreatePendingInput {
  purpose: PendingPurpose;
  amount: number;
  customerEmail?: string;
  walletId?: string;
  collectionId?: string;
  collectionMemberId?: string;
  payerPlatformUserId?: string;
}

export interface CreatedPending {
  pendingPayment: PendingPayment;
  flashAccountNumber: string;
  flashBankName: string;
  flashAccountName?: string;
  checkoutLink: string;
}

const FALLBACK_EMAIL = "noreply@talli.app";
const EXPIRY_MINUTES = 60;
const MAX_POLL_ATTEMPTS = 90;

/**
 * Inbound bank-transfer payments. A pending payment is the in-flight
 * reconciliation record: a Nomba checkout order whose flash account number the
 * payer transfers to, polled by the cron until the money lands. On settlement it
 * is promoted to a permanent {@link Payment} row (the system of record) and the
 * destination is credited. Idempotent: a settled order credits once and writes
 * one Payment.
 */
class PaymentService {
  async create(input: CreatePendingInput): Promise<CreatedPending> {
    const order = await nomba.checkout.createOrder({
      orderReference: `talli_${input.purpose}_${randomToken(10)}`,
      amount: input.amount,
      currency: "NGN",
      customerEmail: input.customerEmail ?? FALLBACK_EMAIL,
      callbackUrl: `${env.PUBLIC_API_URL ?? ""}/api/webhook/nomba`,
    });

    const orderRefId = order.orderReference;
    if (!orderRefId) throw new BadRequestException("Nomba did not return an order reference id");

    const flash = await nomba.checkout.getFlashAccount(orderRefId);

    const pendingPayment = await prisma.pendingPayment.create({
      data: {
        orderRefId,
        purpose: input.purpose,
        amount: input.amount,
        walletId: input.walletId,
        collectionId: input.collectionId,
        collectionMemberId: input.collectionMemberId,
        payerPlatformUserId: input.payerPlatformUserId,
        flashAccountNumber: flash.accountNumber,
        flashBankName: flash.bankName,
        flashAccountName: flash.accountName,
        expiresAt: dayjs().add(EXPIRY_MINUTES, "minute").toDate(),
      },
    });

    return {
      pendingPayment,
      flashAccountNumber: flash.accountNumber,
      flashBankName: flash.bankName,
      flashAccountName: flash.accountName,
      checkoutLink: order.checkoutLink,
    };
  }

  async getByOrderRefId(orderRefId: string): Promise<PendingPayment | null> {
    return prisma.pendingPayment.findUnique({ where: { orderRefId } });
  }

  async listPollable(limit = 50): Promise<PendingPayment[]> {
    return prisma.pendingPayment.findMany({
      where: { status: "pending", pollAttempts: { lt: MAX_POLL_ATTEMPTS } },
      orderBy: { createdAt: "asc" },
      take: limit,
    });
  }

  /**
   * Checks one pending payment against Nomba and settles it. Returns true when it
   * reaches a terminal state (completed / expired / failed). Safe to call
   * repeatedly — crediting is idempotent on the order reference.
   */
  async reconcile(pendingId: string): Promise<boolean> {
    const pending = await prisma.pendingPayment.findUnique({ where: { id: pendingId } });
    if (!pending) throw new NotFoundException("Pending payment not found");
    if (pending.status !== "pending") return true;

    if (pending.expiresAt && dayjs().isAfter(pending.expiresAt)) {
      await this.mark(pending.id, "expired");
      return true;
    }

    let paid = false;
    let receivedAmount = pending.amount;
    try {
      const receipt = await nomba.checkout.confirmReceipt(pending.orderRefId);
      paid = receipt.status === true;
      const received = this.toNaira(receipt.order?.amount);
      if (received !== null) receivedAmount = received;
    } catch (err) {
      logger.warn(`[payment] reconcile ${pending.orderRefId} poll failed: ${(err as Error).message}`);
    } finally {
      await prisma.pendingPayment.update({
        where: { id: pending.id },
        data: { pollAttempts: { increment: 1 } },
      });
    }

    if (!paid) return false;

    await this.settle(pending, receivedAmount);
    return true;
  }

  /**
   * Credits the destination, then marks the payment completed. Credit runs first
   * so a failure leaves the row `pending` for the next poll to retry — the money
   * is never lost. Crediting is idempotent (wallet dedupes on the order ref;
   * collection settle claims the row), so a retry can't double-credit.
   */
  private async settle(pending: PendingPayment, amount: number): Promise<void> {
    if (pending.purpose === "topup" && pending.walletId) {
      await walletService.credit(pending.walletId, amount, "topup", pending.orderRefId);
    } else if (pending.purpose === "collection" && pending.collectionMemberId) {
      const claim = await prisma.pendingPayment.updateMany({
        where: { id: pending.id, status: "pending" },
        data: { status: "completed", completedAt: new Date() },
      });
      if (claim.count === 0) return;

      let credit;
      try {
        credit = await collectionService.creditMember(pending.collectionMemberId, amount);
        await this.recordCollectionPayment(pending, amount);
      } catch (err) {
        await prisma.pendingPayment.update({
          where: { id: pending.id },
          data: { status: "pending", completedAt: null },
        });
        throw err;
      }

      await this.announcePayment(credit, amount);
      return;
    }

    await prisma.pendingPayment.update({
      where: { id: pending.id },
      data: { status: "completed", completedAt: new Date() },
    });
  }

  /**
   * Promotes a settled collection pending payment to the permanent ledger: writes
   * one {@link Payment} row and credits the workspace owner's wallet. Both halves
   * are idempotent on the Nomba order reference — the Payment is keyed on
   * `providerOrderId` and the wallet ledger dedupes on `referenceId` — so a replay
   * (cron retry or backfill) never doubles the money or the record. Shared by the
   * live settle path and the backfill script.
   */
  async recordCollectionPayment(pending: PendingPayment, amount: number): Promise<Payment> {
    if (!pending.collectionId || !pending.collectionMemberId) {
      throw new BadRequestException("Collection payment is missing its collection or member");
    }

    const collection = await prisma.collection.findUniqueOrThrow({
      where: { id: pending.collectionId },
      select: { workspaceId: true, workspace: { select: { ownerUserId: true } } },
    });

    const wallet = await walletService.ensureWallet(collection.workspace.ownerUserId);
    await walletService.credit(wallet.id, amount, "collection", pending.orderRefId);

    const existing = await prisma.payment.findFirst({
      where: { providerOrderId: pending.orderRefId },
    });
    if (existing) return existing;

    return prisma.payment.create({
      data: {
        workspaceId: collection.workspaceId,
        collectionId: pending.collectionId,
        collectionMemberId: pending.collectionMemberId,
        payerPlatformId: pending.payerPlatformUserId,
        amount,
        provider: "nomba",
        providerOrderId: pending.orderRefId,
        status: "successful",
        paidAt: pending.completedAt ?? new Date(),
      },
    });
  }

  /**
   * Posts a celebratory "X just paid" message to the collection's group with the
   * running progress. Best-effort: a send failure (or no linked chat) is logged
   * and swallowed — the payment is already credited and must not be rolled back
   * by a notification problem. The bot client is imported from `telegram/bot.js`
   * (not `telegram/index.js`) so the handler graph isn't pulled in — that would
   * be a cycle, since handlers import this service.
   */
  private async announcePayment(
    credit: Awaited<ReturnType<typeof collectionService.creditMember>>,
    amount: number
  ): Promise<void> {
    if (!credit.chatId) return;
    const caption = messages.collectionPaid({
      payerName: credit.memberName,
      payerId: credit.member.platformUserId,
      amount,
      title: credit.collection.title,
      collectedTotal: credit.collectedTotal,
      targetAmount: credit.collection.targetAmount,
      paidCount: credit.paidCount,
      targetReached: credit.targetReached,
    });
    try {
      const receipt = await receiptService.render({
        amount: amount.toLocaleString("en-NG"),
        purpose: "Collection payment",
        highlight: credit.collection.title,
        rows: [
          { icon: "from", label: "From", value: credit.memberName },
          { icon: "to", label: "To", value: credit.collection.title },
          { icon: "date", label: "Date", value: dayjs().format("DD MMM YYYY, h:mm A") },
          { icon: "ref", label: "Reference", value: credit.member.id, mono: true },
        ],
      });
      await telegram.sendPhoto(credit.chatId, receipt, caption);
    } catch (err) {
      logger.warn(`[payment] receipt render failed, sending text: ${(err as Error).message}`);
      await telegram.sendMessage(credit.chatId, caption);
    }
  }

  /** Parses Nomba's naira amount (number or "50.00" string) to integer naira. */
  private toNaira(value: unknown): number | null {
    if (value === undefined || value === null || value === "") return null;
    const n = typeof value === "string" ? Number(value) : (value as number);
    return Number.isFinite(n) && n > 0 ? Math.round(n) : null;
  }

  private async mark(id: string, status: "expired" | "failed"): Promise<void> {
    await prisma.pendingPayment.update({ where: { id }, data: { status } });
  }
}

export const paymentService = new PaymentService();
export default paymentService;
