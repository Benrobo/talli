import { z } from "zod";
import type { ApiSuccess } from "@app/shared";

export const createLinkCodeSchema = z.object({
  platform: z.enum(["telegram", "whatsapp"]).default("telegram"),
  purpose: z.enum(["private_link", "group_link"]).default("private_link"),
});

export type CreateLinkCodePayload = z.infer<typeof createLinkCodeSchema>;

export interface LinkCodeData {
  code: string;
  deepLink: string;
  expiresAt: string;
}

export interface ConnectedChat {
  id: string;
  platform: string;
  platformChatId: string;
  chatType: string;
  title: string | null;
  connectedAt: string;
  connectedBy: {
    id: string;
    name: string | null;
    email: string;
  } | null;
}

export type CreateLinkCodeResponse = ApiSuccess<LinkCodeData>;
export type ListConnectedChatsResponse = ApiSuccess<ConnectedChat[]>;
export type DisconnectChatResponse = ApiSuccess<null>;
