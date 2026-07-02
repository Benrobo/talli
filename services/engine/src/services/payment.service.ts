import dayjs from "dayjs";
import type { BillSplit } from "@prisma/client";
import prisma from "../prisma/index.js";
import env from "../config/env.js";
import { randomToken } from "../lib/utils.js";
import { nomba } from "../integrations/nomba/index.js";
import { telegram } from "../integrations/telegram/bot.js";
import { messages } from "../integrations/telegram/ui/messages.js";
import { ledgerService } from "./ledger.service.js";
import { collectionService } from "./collection.service.js";
import { billSplitService } from "./bill-split.service.js";
import { virtualAccountService } from "./virtual-account.service.js";
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

export interface CreateCollectionCheckoutInput {
  collectionId: string;
  collectionMemberId: string;
  amount: number;
  customerEmail?: string;
  payerPlatformUserId?: string;
}

export interface CreatedCollectionCheckout {
  pendingPayment: PendingPayment;
  flashAccountNumber: string;
  flashBankName: string;
  flashAccountName?: string;
  checkoutLink: string;
}

export interface CreatedVirtualAccountFunding {
  pendingPayment: PendingPayment;
  virtualAccountNumber: string;
  bankName: string;
  accountName: string;
}

export interface CollectionPayCheckoutResult {
  amount: number;
  payerName: string;
  flashAccountNumber: string;
  flashBankName: string;
  flashAccountName?: string;
  checkoutUrl: string;
}

const FALLBACK_EMAIL = "noreply@talli.app";
const EXPIRY_MINUTES = 30;
const POLL_INTERVAL_SECONDS = 5;
const MAX_POLL_ATTEMPTS = (EXPIRY_MINUTES * 60) / POLL_INTERVAL_SECONDS;

class PaymentService {
  async createTopUp(userId: string, amount: number): Promise<CreatedVirtualAccountFunding> {
    if (amount <= 0) throw new BadRequestException("Amount must be greater than zero");

    const account = await virtualAccountService.requireByUser(userId);
    const pendingPayment = await prisma.pendingPayment.create({
      data: {
        orderRefId: `talli_wallet_topup_${randomToken(10)}`,
        purpose: "wallet_topup",
        userId,
        amount,
        virtualAccountNumber: account.accountNumber,
        expiresAt: dayjs().add(EXPIRY_MINUTES, "minute").toDate(),
      },
    });

    return {
      pendingPayment,
      virtualAccountNumber: account.accountNumber,
      bankName: account.bankName,
      accountName: account.accountName,
    };
  }

  async createSavingsFunding(
    userId: string,
    jarId: string,
    amount: number
  ): Promise<CreatedVirtualAccountFunding> {
    if (amount <= 0) throw new BadRequestException("Amount must be greater than zero");

    const jar = await prisma.savingsJar.findFirst({
      where: { id: jarId, ownerUserId: userId },
      select: { id: true },
    });
    if (!jar) throw new NotFoundException("Savings jar not found");

    const account = await virtualAccountService.requireByUser(userId);
    const pendingPayment = await prisma.pendingPayment.create({
      data: {
        orderRefId: `talli_savings_funding_${randomToken(10)}`,
        purpose: "savings_funding",
        userId,
        savingsJarId: jar.id,
        amount,
        virtualAccountNumber: account.accountNumber,
        expiresAt: dayjs().add(EXPIRY_MINUTES, "minute").toDate(),
      },
    });

    return {
      pendingPayment,
      virtualAccountNumber: account.accountNumber,
      bankName: account.bankName,
      accountName: account.accountName,
    };
  }

  async checkoutCollectionPay(
    collectionId: string,
    input: { memberId?: string; payerName?: string; amount?: number }
  ): Promise<CollectionPayCheckoutResult> {
    const member = await collectionService.resolvePayMember(collectionId, input);
    const amount = Math.max(0, member.expectedAmount - member.paidAmount);
    if (amount <= 0) throw new BadRequestException("Nothing left to pay for this member");

    const pending = await this.createCollectionCheckout({
      collectionId,
      collectionMemberId: member.id,
      amount,
    });

    if (!pending.checkoutLink) {
      throw new BadRequestException("Couldn't generate a pay link for this collection");
    }

    return {
      amount,
      payerName: member.displayName,
      flashAccountNumber: pending.flashAccountNumber,
      flashBankName: pending.flashBankName,
      flashAccountName: pending.flashAccountName,
      checkoutUrl: pending.checkoutLink,
    };
  }

  async createCollectionCheckout(
    input: CreateCollectionCheckoutInput
  ): Promise<CreatedCollectionCheckout> {
    if (input.amount <= 0) throw new BadRequestException("Amount must be greater than zero");

    const order = await nomba.checkout.createOrder({
      orderReference: `talli_collection_${randomToken(10)}`,
      amount: this.toNombaAmount(input.amount),
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
        purpose: "collection",
        amount: input.amount,
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

  async reconcile(pendingId: string): Promise<boolean> {
    const pending = await prisma.pendingPayment.findUnique({ where: { id: pendingId } });
    if (!pending) throw new NotFoundException("Pending payment not found");
    if (pending.status === "completed" || pending.status === "cancelled") return true;

    const previousStatus = pending.status;
    const canExpire = previousStatus === "pending";

    if (canExpire && pending.expiresAt && dayjs().isAfter(pending.expiresAt)) {
      await this.mark(pending.id, "expired");
      return true;
    }

    const outcome =
      pending.purpose === "collection"
        ? await this.pollFlash(pending)
        : await this.pollVirtualAccount(pending);

    if (canExpire) {
      await prisma.pendingPayment.update({
        where: { id: pending.id },
        data: { pollAttempts: { increment: 1 } },
      });
    }

    if (!outcome.paid) return previousStatus !== "pending";

    if (outcome.sessionId) {
      const claimed = await this.claimTransaction(pending.id, outcome.sessionId);
      if (!claimed) {
        logger.warn(
          `[payment] ${pending.orderRefId} could not claim tx ${outcome.sessionId} (already used) — not settling`
        );
        return previousStatus !== "pending";
      }
    }

    await this.settle(pending, outcome.amount, previousStatus);
    return true;
  }

  private async claimTransaction(pendingId: string, sessionId: string): Promise<boolean> {
    try {
      const res = await prisma.pendingPayment.updateMany({
        where: { id: pendingId, providerTransactionId: null },
        data: { providerTransactionId: sessionId },
      });
      return res.count === 1;
    } catch (err) {
      if ((err as { code?: string }).code === "P2002") return false;
      throw err;
    }
  }

  private async pollFlash(
    pending: PendingPayment
  ): Promise<{ paid: boolean; amount: number; sessionId: string | null }> {
    let paid = false;
    let amount = pending.amount;
    try {
      const receipt = await nomba.checkout.confirmReceipt(pending.orderRefId);
      paid = receipt.status === true;
      const received = this.fromNombaAmount(receipt.order?.amount);
      if (received !== null) amount = received;
    } catch (err) {
      logger.warn(`[payment] reconcile ${pending.orderRefId} poll failed: ${(err as Error).message}`);
    }
    return { paid, amount, sessionId: null };
  }

  private async pollVirtualAccount(
    pending: PendingPayment
  ): Promise<{ paid: boolean; amount: number; sessionId: string | null }> {
    const tag = `[va-poll ${pending.orderRefId}]`;
    const miss = { paid: false, amount: pending.amount, sessionId: null };
    if (!pending.virtualAccountNumber) {
      logger.warn(`${tag} no virtualAccountNumber on pending row — cannot poll`);
      return miss;
    }

    const query = {
      virtualAccountNumber: pending.virtualAccountNumber,
      dateFrom: dayjs(pending.createdAt).format("YYYY-MM-DD"),
      dateTo: dayjs().add(1, "day").format("YYYY-MM-DD"),
    };

    try {
      const page = await nomba.transactions.listByVirtualAccount(query);
      const results = page.results ?? [];

      const va = pending.virtualAccountNumber;
      const candidates = results.filter((tx) => {
        if (String(tx.status).toUpperCase() !== "SUCCESS") return false;
        if (String(tx.entryType).toUpperCase() !== "CREDIT") return false;
        if (tx.recipientAccountNumber !== va) return false;
        if (this.toNaira(tx.amount) !== pending.amount) return false;
        if (!tx.timeCreated) return false;
        return dayjs(tx.timeCreated).isAfter(pending.createdAt);
      });

      console.log(`${tag} fetched ${results.length} tx, ${candidates.length} candidate(s) for VA ${va} ₦${pending.amount} after ${pending.createdAt.toISOString()}`)
      

      if (candidates.length === 0) {
        console.log(`🔴 ${tag} no fresh SUCCESS credit for ₦${pending.amount} yet`);
        return miss;
      }

      const sessionIds = candidates
        .map((tx) => this.sessionId(tx))
        .filter((s): s is string => !!s);
      const claimedRows = await prisma.pendingPayment.findMany({
        where: { providerTransactionId: { in: sessionIds } },
        select: { providerTransactionId: true },
      });
      const claimed = new Set(
        claimedRows.map((row) => row.providerTransactionId).filter((s): s is string => !!s)
      );

      const match = candidates.find((tx) => {
        const sid = this.sessionId(tx);
        return !!sid && !claimed.has(sid);
      });

      if (!match) {
        console.log(`🔴 ${tag} ${candidates.length} matching tx but all already claimed by other intents (claimed=${[...claimed].join(",") || "-"}) — NOT settling`);
        return miss;
      }

      const sessionId = this.sessionId(match);

      if (sessionId) {
        try {
          const confirmed = await nomba.transactions.requery(sessionId);

          console.log(`[transactions.requery] ${sessionId} confirmed: ${JSON.stringify(confirmed, null, 2)}`)

          if (String(confirmed.status).toUpperCase() !== "SUCCESS") {
            console.log(`🔴 ${tag} requery not SUCCESS — holding`);
            return miss;
          }
        } catch (err) {
          console.log(`🔴 ${tag} requery ${sessionId} failed: ${(err as Error).message}`);
          return miss;
        }
      }

      const received = this.toNaira(match.amount);
      logger.info(`${tag} confirmed paid — settling ₦${received ?? pending.amount} (session ${sessionId})`);
      return { paid: true, amount: received ?? pending.amount, sessionId };
    } catch (err) {
      logger.warn(`${tag} poll failed: ${(err as Error).message}`);
      return miss;
    }
  }

  async reconcileOnce(
    pendingPaymentId: string,
    collectionReference: string
  ): Promise<{ status: PendingPayment["status"]; amount: number }> {
    const pending = await prisma.pendingPayment.findUnique({ where: { id: pendingPaymentId } });
    if (!pending) throw new NotFoundException("Pending payment not found");
    if (pending.purpose === "collection" && pending.collectionId !== collectionReference) {
      throw new BadRequestException("Pending payment does not belong to this collection");
    }

    try {
      await this.reconcile(pendingPaymentId);
    } catch (err) {
      logger.warn(`[payment] reconcileOnce ${pending.orderRefId} failed: ${(err as Error).message}`);
    }

    const fresh = await prisma.pendingPayment.findUnique({
      where: { id: pendingPaymentId },
      select: { status: true, amount: true },
    });

    return {
      status: fresh?.status ?? pending.status,
      amount: fresh?.amount ?? pending.amount,
    };
  }

  async reconcileSavingsOnce(
    pendingPaymentId: string,
    jarId: string
  ): Promise<{ status: PendingPayment["status"]; amount: number }> {
    const pending = await prisma.pendingPayment.findUnique({ where: { id: pendingPaymentId } });
    if (!pending) throw new NotFoundException("Pending payment not found");
    if (pending.purpose !== "savings_funding" || pending.savingsJarId !== jarId) {
      throw new BadRequestException("Pending payment does not belong to this jar");
    }

    try {
      await this.reconcile(pendingPaymentId);
    } catch (err) {
      logger.warn(`[payment] reconcileSavingsOnce ${pending.orderRefId} failed: ${(err as Error).message}`);
    }

    const fresh = await prisma.pendingPayment.findUnique({
      where: { id: pendingPaymentId },
      select: { status: true, amount: true },
    });

    return {
      status: fresh?.status ?? pending.status,
      amount: fresh?.amount ?? pending.amount,
    };
  }

  /**
   * Drives + reads a wallet top-up's status on demand, keyed on its orderRefId and
   * scoped to the owner. Lets the top-up sheet poll for completion instead of waiting
   * on the background cron, so the UI flips to "done" the moment the transfer lands.
   */
  async reconcileTopUpOnce(
    orderRefId: string,
    userId: string
  ): Promise<{ status: PendingPayment["status"]; amount: number }> {
    const pending = await prisma.pendingPayment.findUnique({ where: { orderRefId } });
    if (!pending) throw new NotFoundException("Pending payment not found");
    if (pending.purpose !== "wallet_topup" || pending.userId !== userId) {
      throw new BadRequestException("Pending payment does not belong to this wallet");
    }

    try {
      await this.reconcile(pending.id);
    } catch (err) {
      logger.warn(`[payment] reconcileTopUpOnce ${orderRefId} failed: ${(err as Error).message}`);
    }

    const fresh = await prisma.pendingPayment.findUnique({
      where: { orderRefId },
      select: { status: true, amount: true },
    });

    return {
      status: fresh?.status ?? pending.status,
      amount: fresh?.amount ?? pending.amount,
    };
  }

  async cancelSavingsFunding(pendingPaymentId: string, jarId: string): Promise<void> {
    await prisma.pendingPayment.deleteMany({
      where: {
        id: pendingPaymentId,
        purpose: "savings_funding",
        savingsJarId: jarId,
        status: "pending",
      },
    });
  }

  private async settle(
    pending: PendingPayment,
    amount: number,
    previousStatus: PendingPayment["status"] = "pending"
  ): Promise<void> {
    const claimableStatuses: PendingPayment["status"][] = ["pending", "failed", "expired"];

    if (pending.purpose === "wallet_topup") {
      if (!pending.userId) return;
      console.log(`🔄 Payment Service Settling Wallet Topup: ${pending.orderRefId}`);
      const entry = await ledgerService.credit(pending.userId, "wallet_topup", amount, {
        referenceId: pending.orderRefId,
        providerOrderId: pending.orderRefId,
        paidAt: new Date(),
      });
      console.log(`✅ Payment Service Settled Wallet Topup: ${pending.orderRefId}`);
      await this.completePending(pending.id);
      if (!entry.duplicate) {
        await this.deliverWalletTopupEmail(pending, amount, entry.balance);
      }
      return;
    }

    if (pending.purpose === "savings_funding") {
      console.log(`🔄 Payment Service Settling Savings Funding: ${pending.orderRefId}`);
      await this.settleSavingsFunding(pending, amount);
      return;
    }

    if (pending.purpose === "collection" && pending.collectionMemberId) {
      console.log(`🔄 Payment Service Settling Collection Payment: ${pending.orderRefId}`);
      const claim = await prisma.$transaction(async (tx: TxClient) => {
        const claimed = await tx.pendingPayment.updateMany({
          where: { id: pending.id, status: { in: claimableStatuses } },
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

      await this.deliverCollectionPayerEmail(pending, amount, previousStatus);
      return;
    }

    await this.completePending(pending.id);
  }

  private async deliverCollectionPayerEmail(
    pending: PendingPayment,
    amount: number,
    previousStatus: PendingPayment["status"]
  ): Promise<void> {
    try {
      if (!pending.collectionMemberId) return;

      const member = await prisma.collectionMember.findUnique({
        where: { id: pending.collectionMemberId },
        select: {
          displayName: true,
          appUser: { select: { email: true } },
          collection: {
            select: { purpose: true, title: true },
          },
        },
      });

      const email = member?.appUser?.email;
      if (!email) {
        logger.debug(`[payment] no payer email for pending ${pending.orderRefId}, skipping mail`);
        return;
      }

      const payerName = member?.displayName ?? "there";
      const purpose = member?.collection?.purpose || member?.collection?.title || "Collection payment";
      const dateLabel = dayjs(pending.completedAt ?? new Date()).format("DD MMM YYYY, h:mm A");
      const recovered = previousStatus === "failed" || previousStatus === "expired";

      if (recovered) {
        await mailService.sendPaymentRecovered(email, {
          payerName,
          amount,
          purpose,
          reference: pending.orderRefId,
          dateLabel,
        });
      } else {
        await mailService.sendPaymentReceipt(email, {
          payerName,
          amount,
          purpose,
          from: payerName,
          to: member?.collection?.title ?? purpose,
          reference: pending.orderRefId,
          dateLabel,
        });
      }
    } catch (err) {
      logger.warn(`[payment] payer email failed for ${pending.orderRefId}: ${(err as Error).message}`);
    }
  }

  private async deliverWalletTopupEmail(
    pending: PendingPayment,
    amount: number,
    newBalance: number
  ): Promise<void> {
    try {
      if (!pending.userId) return;
      const user = await prisma.user.findUnique({
        where: { id: pending.userId },
        select: { email: true, name: true },
      });
      if (!user?.email) {
        logger.debug(`[payment] no email for topup ${pending.orderRefId}, skipping mail`);
        return;
      }
      await mailService.sendWalletTopup(user.email, {
        name: user.name ?? "there",
        amount,
        newBalance,
        reference: pending.orderRefId,
        dateLabel: dayjs(pending.completedAt ?? new Date()).format("DD MMM YYYY, h:mm A"),
      });
    } catch (err) {
      logger.warn(`[payment] topup email failed for ${pending.orderRefId}: ${(err as Error).message}`);
    }
  }

  private async deliverSavingsReceiptEmail(
    pending: PendingPayment,
    amount: number,
    jarName: string
  ): Promise<void> {
    try {
      if (!pending.userId) return;
      const user = await prisma.user.findUnique({
        where: { id: pending.userId },
        select: { email: true, name: true },
      });
      if (!user?.email) {
        logger.debug(`[payment] no email for savings ${pending.orderRefId}, skipping mail`);
        return;
      }
      const name = user.name ?? "there";
      await mailService.sendPaymentReceipt(user.email, {
        payerName: name,
        amount,
        purpose: `Savings — ${jarName}`,
        from: name,
        to: jarName,
        reference: pending.orderRefId,
        dateLabel: dayjs(pending.completedAt ?? new Date()).format("DD MMM YYYY, h:mm A"),
      });
    } catch (err) {
      logger.warn(`[payment] savings email failed for ${pending.orderRefId}: ${(err as Error).message}`);
    }
  }

  private async settleSavingsFunding(pending: PendingPayment, amount: number): Promise<void> {
    if (!pending.userId || !pending.savingsJarId) return;

    const claim = await prisma.pendingPayment.updateMany({
      where: { id: pending.id, status: { in: ["pending", "failed", "expired"] } },
      data: { status: "completed", completedAt: new Date() },
    });
    if (claim.count === 0) return;

    const jar = await prisma.savingsJar.findFirst({
      where: { id: pending.savingsJarId, ownerUserId: pending.userId },
      select: { id: true, name: true },
    });
    if (!jar) return;

    const existing = await prisma.payment.findFirst({
      where: {
        OR: [{ referenceId: pending.orderRefId }, { providerOrderId: pending.orderRefId }],
      },
      select: { id: true },
    });
    if (existing) return;

    await prisma.$transaction(async (tx: TxClient) => {
      await tx.payment.create({
        data: {
          userId: pending.userId!,
          direction: "credit",
          kind: "savings_deposit",
          amount,
          status: "successful",
          balanceAfter: null,
          savingsJarId: jar.id,
          provider: "nomba",
          providerOrderId: pending.orderRefId,
          referenceId: pending.orderRefId,
          paidAt: pending.completedAt ?? new Date(),
        },
      });
      await tx.savingsJar.update({
        where: { id: jar.id },
        data: { currentAmount: { increment: amount } },
      });
    });

    await this.deliverSavingsReceiptEmail(pending, amount, jar.name);
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
    billSplit: BillSplit,
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

    const owner = await prisma.user.findUnique({
      where: { id: billSplit.createdByUserId },
      select: { email: true },
    });
    const email = owner?.email;
    if (!email) return;
    await mailService.send({
      to: email,
      subject: `${payerName} paid ₦${amount.toLocaleString("en-NG")} on "${billSplit.title}"`,
      html: `<p><strong>${payerName}</strong> just paid <strong>₦${amount.toLocaleString(
        "en-NG"
      )}</strong> for: ${itemLabels.join(", ")} on your bill split <strong>${billSplit.title}</strong>.</p>`,
    });
  }

  async recordCollectionPayment(pending: PendingPayment, amount: number): Promise<Payment> {
    console.log(`🔄 Payment Service Recording Collection Payment: ${pending.orderRefId}`);
    if (!pending.collectionId || !pending.collectionMemberId) {
      throw new BadRequestException("Collection payment is missing its collection or member");
    }

    const collection = await prisma.collection.findUniqueOrThrow({
      where: { id: pending.collectionId },
      select: { ownerUserId: true },
    });

    const { payment } = await ledgerService.credit(collection.ownerUserId, "collection_payment", amount, {
      referenceId: pending.orderRefId,
      providerOrderId: pending.orderRefId,
      collectionId: pending.collectionId,
      collectionMemberId: pending.collectionMemberId,
      payerPlatformId: pending.payerPlatformUserId ?? undefined,
      paidAt: pending.completedAt ?? new Date(),
    });

    console.log(`✅ Payment Service Recorded Collection Payment: ${pending.orderRefId}`);

    return payment;
  }

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

  private toNaira(value: unknown): number | null {
    if (value === undefined || value === null || value === "") return null;
    const n = typeof value === "string" ? Number(value) : (value as number);
    return Number.isFinite(n) && n > 0 ? Math.round(n) : null;
  }

  private sessionId(tx: Record<string, unknown>): string | null {
    const value = tx.sessionId ?? tx.session_id;
    return typeof value === "string" && value.length > 0 ? value : null;
  }

  private toNombaAmount(amount: number): number {
    return Math.round(amount);
  }

  private fromNombaAmount(value: unknown): number | null {
    const naira = this.toNaira(value);
    if (naira === null) return null;
    return naira;
  }

  private async completePending(id: string): Promise<void> {
    await prisma.pendingPayment.update({
      where: { id },
      data: { status: "completed", completedAt: new Date() },
    });
  }

  private async mark(id: string, status: "expired" | "failed"): Promise<void> {
    await prisma.pendingPayment.update({ where: { id }, data: { status } });
  }
}

export const paymentService = new PaymentService();
export default paymentService;
