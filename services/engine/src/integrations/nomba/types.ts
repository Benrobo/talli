/**
 * Shared Nomba request/response types. Field shapes mirror the verified
 * OpenAPI 1.0.0 spec (see `docs/nomba-api.md`). Resources own their own
 * narrow param types; this file holds the cross-cutting envelope and the
 * objects that appear in more than one place.
 */

export type NombaEnv = "test" | "live";

export const NOMBA_BASE_URLS: Record<NombaEnv, string> = {
  test: "https://sandbox.nomba.com",
  live: "https://api.nomba.com",
};

/**
 * Every Nomba response is wrapped in this envelope. `code === "00"` is the
 * only success value — a `200` HTTP status alone does not mean success.
 */
export interface NombaEnvelope<T> {
  code: string;
  description: string;
  data: T;
}

export interface NombaTokenData {
  businessId: string;
  access_token: string;
  refresh_token: string;
  expiresAt: string;
}

export type TransferStatus =
  | "NEW"
  | "PENDING_PAYMENT"
  | "PAYMENT_SUCCESSFUL"
  | "PAYMENT_FAILED"
  | "PENDING_BILLING"
  | "SUCCESS"
  | "REFUND";

/** Recognised Nomba webhook event names (from prose docs — see §9). */
export type NombaWebhookEventType =
  | "payment_success"
  | "payment_failed"
  | "payment_reversal"
  | "payout_success"
  | "payout_failed"
  | "payout_refund";
