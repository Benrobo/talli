import { z } from "zod";

export const telegramWebhookSchema = z.object({
  update_id: z.number(),
  message: z
    .object({
      message_id: z.number(),
      date: z.number(),
      chat: z.object({
        id: z.number(),
        type: z.string(),
      }),
      from: z
        .object({
          id: z.number(),
          is_bot: z.boolean(),
          first_name: z.string(),
        })
        .optional(),
      text: z.string().optional(),
    })
    .optional(),
});

export const nombaWebhookSchema = z.object({
  event_type: z.string(),
  requestId: z.string(),
  data: z.record(z.unknown()),
});

export const nombaWebhookHeadersSchema = z.object({
  "nomba-signature": z.string().min(1),
  "nomba-timestamp": z.string().min(1),
});

export type TelegramWebhookPayload = z.infer<typeof telegramWebhookSchema>;
export type NombaWebhookPayload = z.infer<typeof nombaWebhookSchema>;
export type NombaWebhookHeaders = z.infer<typeof nombaWebhookHeadersSchema>;

export interface WebhookDiscoveryData {
  telegram: string;
  nomba: string;
}

export interface WebhookDiscoveryResponse {
  code: number;
  message: string;
  data: WebhookDiscoveryData;
  status: number;
}

export interface NombaWebhookResponse {
  accepted: boolean;
}

export interface TelegramWebhookResponse {
  ok?: boolean;
}
