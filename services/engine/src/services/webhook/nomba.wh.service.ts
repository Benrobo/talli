import logger from "../../lib/logger.js";
import { nomba, type NombaWebhookEvent } from "../../integrations/nomba/index.js";
import { webhookService } from "./webhook.service.js";

/**
 * Verifies and records Nomba webhooks. In v2 crediting happens via polling (see
 * `pending-payment.service` + the reconcile cron), so this only stores the event
 * for audit; it is not load-bearing.
 */
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

    await webhookService.recordEvent({
      provider: "nomba",
      providerEventId: event.requestId,
      eventType: event.event_type,
      rawPayload: event,
      signatureValid: true,
    });

    logger.info(`[webhook] nomba ${event.event_type} recorded (reconciliation is via polling)`);
    return { accepted: true };
  }
}

export const nombaWebhookService = new NombaWebhookService();
export default nombaWebhookService;
