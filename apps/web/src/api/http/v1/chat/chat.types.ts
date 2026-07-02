import { z } from "zod";
import type { ApiSuccess } from "@app/shared";

export const createLinkCodeSchema = z.object({
  platform: z.enum(["telegram", "whatsapp"]).default("telegram"),
  purpose: z.enum(["private_link", "group_link"]).default("private_link"),
});

export type CreateLinkCodePayload = z.infer<typeof createLinkCodeSchema>;

export interface LinkCodeData {
  code: string;
  expiresAt: string;
  instructions: string;
  deepLink?: string;
  command?: string;
}

export interface ConnectedChat {
  id: string;
  platform: string;
  chatType: string;
  title: string | null;
  status: string;
  connectedBy: string | null;
  verifiedAt: string | null;
  createdAt: string;
}

export type CreateLinkCodeResponse = ApiSuccess<LinkCodeData>;
export type ListConnectedChatsResponse = ApiSuccess<ConnectedChat[]>;
export type DisconnectChatResponse = ApiSuccess<null>;
