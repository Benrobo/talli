import dayjs from "dayjs";
import prisma from "../prisma/index.js";
import env from "../config/env.js";
import { randomToken } from "../lib/utils.js";
import { nomba } from "../integrations/nomba/index.js";
import { telegram } from "../integrations/telegram/bot.js";
import { messages } from "../integrations/telegram/ui/messages.js";
import { walletService } from "./wallet.service.js";
import { collectionService } from "./collection.service.js";
import { savingsService } from "./savings.service.js";
import { billSplitService } from "./bill-split.service.js";
import { mailService } from "./mail.service.js";
import { receiptService } from "./receipt/index.js";
import { emitToBill } from "../socket/server.js";
import logger from "../lib/logger.js";
import { BadRequestException, NotFoundException } from "../lib/exception.js";

type PendingPayment = NonNullable<Awaited<ReturnType<typeof prisma.pendingPayment.findUnique>>>;
type Payment = NonNullable<Awaited<ReturnType<typeof prisma.payment.findFirst>>>;
type TxClient = Parameters<typeof prisma.$transaction>[0] extends (
  tx: infer T
) => Promise<unknown>
  ? T
  : never;

export type PendingPurpose = "topup" | "collection";

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
  async createSavingsFunding(
    workspaceId: string,
    userId: string,
    jarId: string,
    amount: number
  ): Promise<CreatedPending> {
    if (amount <= 0) throw new BadRequestException("Amount must be greater than zero");

    const jar = await prisma.savingsJar.findFirst({
      where: { id: jarId, workspaceId, ownerUserId: userId },
      select: { id: true },
    });
    if (!jar) throw new NotFoundException("Savings jar not found");

    const wallet = await walletService.ensureWallet(userId);
    return this.create({
      purpose: "topup",
      amount,
      walletId: wallet.id,
      collectionId: jar.id,
    });
  }

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

  private async settle(pending: PendingPayment, amount: number): Promise<void> {
    if (pending.purpose === "topup" && pending.walletId) {
      if (pending.collectionId) {
        const funded = await this.settleSavingsFunding(pending, amount);
        if (funded) return;
      }
      await walletService.credit(pending.walletId, amount, "topup", pending.orderRefId);
    } else if (pending.purpose === "collection" && pending.collectionMemberId) {
      const claim = await prisma.$transaction(async (tx: TxClient) => {
        const claimed = await tx.pendingPayment.updateMany({
          where: { id: pending.id, status: "pending" },
          data: { status: "completed", completedAt: new Date() },
        });
        if (claimed.count === 0) return null;
        return collectionService.creditMember(pending.collectionMemberId!, amount, tx);
      });
      if (!claim) return;

      await this.recordCollectionPayment(pending, amount);

      let handledByBillSplit = false;
      try {
        handledByBillSplit = await this.settleBillSplitIfAny(pending, amount);
      } catch (err) {
        logger.error(`[payment] bill split settle failed for ${pending.orderRefId}: ${(err as Error).message}`);
      }
      if (!handledByBillSplit) {
        await this.announcePayment(claim, amount);
      }
      return;
    }

    await prisma.pendingPayment.update({
      where: { id: pending.id },
      data: { status: "completed", completedAt: new Date() },
    });
  }

  private async settleSavingsFunding(pending: PendingPayment, amount: number): Promise<boolean> {
    if (!pending.collectionId) return false;

    const claim = await prisma.pendingPayment.updateMany({
      where: { id: pending.id, status: "pending" },
      data: { status: "completed", completedAt: new Date() },
    });
    if (claim.count === 0) return true;

    const jar = await prisma.savingsJar.findUnique({
      where: { id: pending.collectionId },
      select: { id: true, workspaceId: true },
    });
    if (!jar) return false;

    const existing = await prisma.payment.findFirst({
      where: { providerOrderId: pending.orderRefId },
      select: { id: true },
    });

    const payment =
      existing ??
      (await prisma.payment.create({
        data: {
          workspaceId: jar.workspaceId,
          savingsJarId: jar.id,
          amount,
          provider: "nomba",
          providerOrderId: pending.orderRefId,
          status: "successful",
          paidAt: pending.completedAt ?? new Date(),
        },
      }));

    await savingsService.creditJar(jar.id, amount, payment.id);
    return true;
  }

  private async settleBillSplitIfAny(pending: PendingPayment, amount: number): Promise<boolean> {
    const settled = await billSplitService.settleByPendingPaymentId(pending.id);
    if (!settled) return false;

    const { billSplit, selection, items } = settled;
    const labels = items.map((i) => i.label);
    const conflicted = "conflicted" in settled ? Boolean(settled.conflicted) : false;

    if (conflicted) {
      logger.warn(
        `[payment] bill split over-payment: selection ${selection.id} paid for items already claimed by others (billSplit ${billSplit.id})`
      );
    }

    try {
      emitToBill(billSplit.token, "items.claimed", {
        selectionId: selection.id,
        payerName: selection.payerName,
        itemIds: items.map((i) => i.id),
        amount,
      });
    } catch (err) {
      logger.warn(`[payment] bill ws emit failed: ${(err as Error).message}`);
    }

    try {
      await this.deliverBillSplitReceipt(billSplit, selection.payerName, labels, amount);
    } catch (err) {
      logger.warn(`[payment] bill receipt delivery failed: ${(err as Error).message}`);
    }
    return true;
  }

  private async deliverBillSplitReceipt(
    billSplit: { id: string; workspaceId: string; title: string; source: string; linkedChatId: string | null },
    payerName: string,
    itemLabels: string[],
    amount: number
  ): Promise<void> {
    if (billSplit.source === "telegram" && billSplit.linkedChatId) {
      const linkedChat = await prisma.linkedChat.findUnique({
        where: { id: billSplit.linkedChatId },
        select: { platformChatId: true },
      });
      if (!linkedChat) return;
      const caption = messages.billSplitItemsPaid(payerName, itemLabels, amount, billSplit.title);
      const receipt = await receiptService.render({
        amount: amount.toLocaleString("en-NG"),
        purpose: "Bill split payment",
        highlight: billSplit.title,
        rows: [
          { icon: "from", label: "From", value: payerName },
          { icon: "to", label: "For", value: itemLabels.join(", ") },
          { icon: "date", label: "Date", value: dayjs().format("DD MMM YYYY, h:mm A") },
        ],
      });
      await telegram.sendPhoto(linkedChat.platformChatId, receipt, caption);
      return;
    }

    const workspace = await prisma.workspace.findUnique({
      where: { id: billSplit.workspaceId },
      select: { owner: { select: { email: true } } },
    });
    const email = workspace?.owner?.email;
    if (!email) return;
    await mailService.send({
      to: email,
      subject: `${payerName} paid ₦${amount.toLocaleString("en-NG")} on "${billSplit.title}"`,
      html: `<p><strong>${payerName}</strong> just paid <strong>₦${amount.toLocaleString(
        "en-NG"
      )}</strong> for: ${itemLabels.join(", ")} on your bill split <strong>${billSplit.title}</strong>.</p>`,
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
