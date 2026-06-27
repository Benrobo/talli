import type { WebhookProcessingStatus } from "@prisma/client";
import prisma from "../../prisma/index.js";

export interface RecordedEvent {
  isNew: boolean;
}

/**
 * Shared webhook plumbing used by the per-provider handlers. Stores every event
 * raw and deduped on `providerEventId`, so a retried delivery never double-runs.
 */
class WebhookService {
  /** Stores a raw event; `isNew: false` means this id was already seen. */
  async recordEvent(params: {
    provider: string;
    providerEventId: string;
    eventType: string;
    rawPayload: unknown;
    signatureValid: boolean | null;
  }): Promise<RecordedEvent> {
    try {
      await prisma.webhookEvent.create({
        data: {
          provider: params.provider,
          providerEventId: params.providerEventId,
          eventType: params.eventType,
          rawPayload: params.rawPayload as object,
          signatureValid: params.signatureValid,
        },
      });
      return { isNew: true };
    } catch (err) {
      if ((err as { code?: string }).code === "P2002") return { isNew: false };
      throw err;
    }
  }

  async markProcessed(
    providerEventId: string,
    status: WebhookProcessingStatus,
    errorMessage?: string
  ): Promise<void> {
    await prisma.webhookEvent.update({
      where: { providerEventId },
      data: { processingStatus: status, errorMessage, processedAt: new Date() },
    });
  }
}

export const webhookService = new WebhookService();
export default webhookService;
