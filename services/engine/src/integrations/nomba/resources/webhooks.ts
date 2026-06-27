import { createHmac, timingSafeEqual } from "node:crypto";
import env from "../../../config/env.js";
import type { NombaWebhookEventType } from "../types.js";

export interface NombaWebhookEvent {
  event_type: NombaWebhookEventType;
  requestId: string;
  data: {
    transaction: {
      id: string;
      status: string;
      amount: number;
      type: string;
      source: string;
      merchantTxRef: string;
      timeCreated: string;
      [key: string]: unknown;
    };
    [key: string]: unknown;
  };
}

/**
 * Webhook helpers — verify Nomba's HMAC signature and parse the event body.
 * Pure (no network), so it's easy to unit-test. The signing-string field order
 * is from Nomba's prose docs (§9.4) and should be validated against a real
 * sandbox webhook before trusting it in production.
 */
export class WebhookResource {
  private readonly secret: string;

  constructor(secret = env.NOMBA_WEBHOOK_SECRET) {
    this.secret = secret;
  }

  /**
   * Recomputes the HMAC over the documented field order and compares it against
   * the `nomba-signature` header in constant time.
   */
  verifySignature(rawBody: string, headers: Record<string, string | undefined>): boolean {
    const signature = headers["nomba-signature"];
    if (!signature || !this.secret) return false;

    let payload: NombaWebhookEvent;
    try {
      payload = JSON.parse(rawBody) as NombaWebhookEvent;
    } catch {
      return false;
    }

    const data = payload.data as Record<string, unknown>;
    const signingString = [
      payload.event_type,
      payload.requestId,
      data.userId ?? "",
      data.walletId ?? "",
      data.transactionId ?? "",
      data.type ?? "",
      data.time ?? "",
      data.responseCode ?? "",
      headers["nomba-timestamp"] ?? "",
    ].join(":");

    const expected = createHmac("sha256", this.secret)
      .update(signingString)
      .digest("base64");

    return this.safeEqual(expected, signature);
  }

  parseEvent(rawBody: string): NombaWebhookEvent {
    return JSON.parse(rawBody) as NombaWebhookEvent;
  }

  private safeEqual(a: string, b: string): boolean {
    const bufA = Buffer.from(a);
    const bufB = Buffer.from(b);
    if (bufA.length !== bufB.length) return false;
    return timingSafeEqual(bufA, bufB);
  }
}
