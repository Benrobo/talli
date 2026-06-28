import type { ChatPlatform, Payment } from "@prisma/client";
import prisma from "../prisma/index.js";
import env from "../config/env.js";
import { nomba } from "../integrations/nomba/index.js";
import { BadRequestException, NotFoundException } from "../lib/exception.js";

export interface StartCollectionPaymentInput {
  collectionId: string;
  memberId: string;
  platform: ChatPlatform;
  platformUserId: string;
  customerEmail?: string;
}

export interface StartedPayment {
  checkoutLink: string;
  ref: string;
  paymentId: string;
}

const FALLBACK_EMAIL = "noreply@talli.app";

/**
 * The single owner of Talli's payment rules over the Nomba SDK. Creates the
 * `payments` cross-reference row, generates the idempotency `ref`, opens the
 * Nomba checkout, and resolves payments when the webhook lands. The Nomba SDK
 * stays rule-free; everything Talli-specific lives here.
 */
class PaymentService {
  /**
   * Starts a collection payment: a `payments` row (pending) + a Nomba checkout
   * order keyed on `ref`. The same ref comes back on the webhook to reconcile.
   * Idempotent: if a pending/successful payment already exists for this member,
   * its checkout link is reused instead of creating a duplicate.
   */
  async startCollectionPayment(input: StartCollectionPaymentInput): Promise<StartedPayment> {
    const member = await prisma.collectionMember.findUnique({
      where: { id: input.memberId },
      include: { collection: { select: { id: true, workspaceId: true } } },
    });
    if (!member || member.collectionId !== input.collectionId) {
      throw new NotFoundException("Collection member not found");
    }
    if (member.expectedAmount <= 0) {
      throw new BadRequestException("This member has no amount to pay");
    }

    const ref = `talli_${input.collectionId}_${input.memberId}`;

    const settled = await prisma.payment.findFirst({
      where: { providerReference: ref, status: "successful" },
    });
    if (settled) {
      throw new BadRequestException("This payment has already been completed");
    }

    const { checkoutLink, orderReference } = await nomba.checkout.createOrder({
      orderReference: ref,
      amount: member.expectedAmount,
      currency: "NGN",
      customerEmail: input.customerEmail ?? FALLBACK_EMAIL,
      callbackUrl: `${env.PUBLIC_API_URL ?? ""}/api/webhook/nomba`,
    });

    const existing = await prisma.payment.findFirst({
      where: { providerReference: ref, status: "pending" },
    });
    const payment = existing
      ? await prisma.payment.update({
          where: { id: existing.id },
          data: { providerOrderId: orderReference },
        })
      : await prisma.payment.create({
          data: {
            workspaceId: member.collection.workspaceId,
            collectionId: input.collectionId,
            collectionMemberId: input.memberId,
            payerPlatformId: input.platformUserId,
            amount: member.expectedAmount,
            provider: "nomba",
            providerReference: ref,
            providerOrderId: orderReference,
            status: "pending",
          },
        });

    return { checkoutLink, ref, paymentId: payment.id };
  }

  async findByRef(ref: string): Promise<Payment | null> {
    return prisma.payment.findFirst({ where: { providerReference: ref } });
  }

  async markSuccessful(paymentId: string, paidAt = new Date()): Promise<Payment> {
    return prisma.payment.update({
      where: { id: paymentId },
      data: { status: "successful", paidAt },
    });
  }

  async markFailed(paymentId: string): Promise<Payment> {
    return prisma.payment.update({
      where: { id: paymentId },
      data: { status: "failed" },
    });
  }
}

export const paymentService = new PaymentService();
export default paymentService;
