import logger from "../../lib/logger.js";
import { nomba, type NombaWebhookEvent } from "../../integrations/nomba/index.js";
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

  /** Dispatches a verified event. Payment crediting lands with the payment service. */
  private async process(event: NombaWebhookEvent): Promise<void> {
    logger.info(`[webhook] nomba ${event.event_type} tx=${event.data.transaction?.merchantTxRef}`);
  }
}

export const nombaWebhookService = new NombaWebhookService();
export default nombaWebhookService;
