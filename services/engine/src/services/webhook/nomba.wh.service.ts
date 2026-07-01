import logger from "../../lib/logger.js";
import { nomba, type NombaWebhookEvent } from "../../integrations/nomba/index.js";
import { paymentService } from "../payment.service.js";
import { collectionService } from "../collection.service.js";
import { telegram } from "../../integrations/telegram/index.js";
import { messages } from "../../integrations/telegram/ui/messages.js";
import { webhookService } from "./webhook.service.js";

/** Verifies and processes Nomba webhooks. */
class NombaWebhookService {
  async handle(
    rawBody: string,
    headers: Record<string, string | undefined>
  ): Promise<{ accepted: boolean }> {
    if (!nomba.webhooks.verifySignature(rawBody, headers)) {
      logger.warn("[webhook] nomba signature invalid — ignoring");
      return { accepted: false };
    }

    const event = nomba.webhooks.parseEvent(rawBody) as NombaWebhookEvent;
    const eventId = event.requestId;

    const { isNew } = await webhookService.recordEvent({
      provider: "nomba",
      providerEventId: eventId,
      eventType: event.event_type,
      rawPayload: event,
      signatureValid: true,
    });
    if (!isNew) return { accepted: true };

    try {
      await this.process(event);
      await webhookService.markProcessed(eventId, "processed");
    } catch (err) {
      await webhookService.markProcessed(eventId, "failed", (err as Error).message);
      logger.error(`[webhook] nomba ${eventId} failed: ${(err as Error).message}`);
    }
    return { accepted: true };
  }

  /** Dispatches a verified event to its side effect. Only inbound credits for now. */
  private async process(event: NombaWebhookEvent): Promise<void> {
    if (event.event_type === "payment_success") {
      await this.creditPayment(event);
      return;
    }
    logger.info(`[webhook] nomba ${event.event_type} — no handler, logged only`);
  }

  /**
   * A successful payment: match the `payments` row by ref, mark it successful,
   * credit the collection member, and announce in the chat. Idempotent — a ref
   * already settled is a no-op (the event was also deduped on requestId upstream).
   */
  private async creditPayment(event: NombaWebhookEvent): Promise<void> {
    const tx = event.data.transaction;
    const ref = tx?.merchantTxRef;
    if (!ref) {
      logger.warn("[webhook] nomba payment_success without merchantTxRef — skipping");
      return;
    }

    const payment = await paymentService.findByRef(ref);
    if (!payment) {
      logger.warn(`[webhook] nomba payment_success for unknown ref ${ref}`);
      return;
    }
    if (payment.status === "successful") return;

    await paymentService.markSuccessful(payment.id);

    if (!payment.collectionMemberId) {
      logger.info(`[webhook] payment ${payment.id} settled (no collection member to credit)`);
      return;
    }

    const progress = await collectionService.creditMember(payment.collectionMemberId, tx.amount);
    await this.announce(progress.chatId, progress.memberName, tx.amount, progress.paidCount);
  }

  /** Announces a credit in the linked chat. Send failures must not fail the webhook. */
  private async announce(
    chatId: string | null,
    memberName: string,
    amount: number,
    paidCount: number
  ): Promise<void> {
    if (!chatId) return;
    try {
      await telegram.sendMessage(chatId, messages.paymentConfirmed(memberName, amount, paidCount));
    } catch (err) {
      logger.error(`[webhook] payment announce failed: ${(err as Error).message}`);
    }
  }
}

export const nombaWebhookService = new NombaWebhookService();
export default nombaWebhookService;
