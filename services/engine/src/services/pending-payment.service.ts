import dayjs from "dayjs";
import type { PendingPayment, PendingPaymentPurpose } from "@prisma/client";
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
 * Inbound bank-transfer payments reconciled by polling, not webhooks. Creates a
 * Nomba checkout order, fetches its flash account number for the payer to
 * transfer to, and (via `reconcile`, run by the cron) credits the wallet or
 * collection once the transfer lands. Idempotent: a settled order credits once.
 */
class PendingPaymentService {
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

      // for debugging purposes
      console.log(JSON.stringify({
        receipt,
      }, null, 2));

      paid = receipt.status === true;
      const received = this.toNaira(receipt.order?.amount);
      if (received !== null) receivedAmount = received;
    } catch (err) {
      logger.warn(`[pending] reconcile ${pending.orderRefId} poll failed: ${(err as Error).message}`);
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

      console.log(`✅ Collection ${pending.collectionMemberId} credited with ${amount}`);

      let credit;
      try {
        credit = await collectionService.creditMember(pending.collectionMemberId, amount);
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
      logger.warn(`[pending] receipt render failed, sending text: ${(err as Error).message}`);
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
    console.log(`🔄 Pending payment ${id} marked as ${status}`);
    await prisma.pendingPayment.update({ where: { id }, data: { status } });
  }
}

export const pendingPaymentService = new PendingPaymentService();
export default pendingPaymentService;
