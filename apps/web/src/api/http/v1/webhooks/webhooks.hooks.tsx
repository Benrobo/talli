import { useMutation, useQuery } from "@tanstack/react-query";
import type { AxiosError } from "axios";
import { WEBHOOKS_API } from "./webhooks.api";
import type {
  NombaWebhookHeaders,
  NombaWebhookPayload,
  NombaWebhookResponse,
  TelegramWebhookPayload,
  TelegramWebhookResponse,
  WebhookDiscoveryResponse,
} from "./webhooks.types";

export const webhooksQueryKeys = {
  all: ["webhooks"] as const,
  discovery: () => [...webhooksQueryKeys.all, "discovery"] as const,
};

export const useWebhookDiscovery = () => {
  return useQuery<WebhookDiscoveryResponse, AxiosError>({
    queryKey: webhooksQueryKeys.discovery(),
    queryFn: WEBHOOKS_API.DISCOVERY,
  });
};

export const useTelegramWebhook = () => {
  return useMutation<TelegramWebhookResponse, AxiosError, TelegramWebhookPayload>({
    mutationFn: WEBHOOKS_API.TELEGRAM,
  });
};

export const useNombaWebhook = () => {
  return useMutation<
    NombaWebhookResponse,
    AxiosError,
    { payload: NombaWebhookPayload; headers: NombaWebhookHeaders }
  >({
    mutationFn: ({ payload, headers }) => WEBHOOKS_API.NOMBA(payload, headers),
  });
};
