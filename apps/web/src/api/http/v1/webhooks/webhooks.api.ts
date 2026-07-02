import apiClient from "../../api-client";
import type {
  NombaWebhookHeaders,
  NombaWebhookPayload,
  NombaWebhookResponse,
  TelegramWebhookPayload,
  TelegramWebhookResponse,
  WebhookDiscoveryResponse,
} from "./webhooks.types";

export const WEBHOOKS_ENDPOINTS = {
  discovery: "/api/webhook",
  telegram: "/api/webhook/telegram",
  nomba: "/api/webhook/nomba",
} as const;

export const WEBHOOKS_API = {
  DISCOVERY: async (): Promise<WebhookDiscoveryResponse> =>
    apiClient.get(WEBHOOKS_ENDPOINTS.discovery).then((res) => res.data),

  TELEGRAM: async (payload: TelegramWebhookPayload): Promise<TelegramWebhookResponse> =>
    apiClient.post(WEBHOOKS_ENDPOINTS.telegram, payload).then((res) => res.data),

  NOMBA: async (
    payload: NombaWebhookPayload,
    headers: NombaWebhookHeaders
  ): Promise<NombaWebhookResponse> =>
    apiClient
      .post(WEBHOOKS_ENDPOINTS.nomba, payload, {
        headers: {
          "nomba-signature": headers["nomba-signature"],
          "nomba-timestamp": headers["nomba-timestamp"],
        },
      })
      .then((res) => res.data),
};
