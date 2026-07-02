import apiClient from "../../api-client";
import type {
  CreateLinkCodePayload,
  CreateLinkCodeResponse,
  DisconnectChatResponse,
  ListConnectedChatsResponse,
} from "./chat.types";

export const CHAT_ENDPOINTS = {
  linkCodes: "/api/chat/link-codes",
  connected: "/api/chat/connected",
  disconnect: (linkedChatId: string) => `/api/chat/connected/${linkedChatId}`,
} as const;

export const CHAT_API = {
  CREATE_LINK_CODE: async (payload: CreateLinkCodePayload): Promise<CreateLinkCodeResponse> =>
    apiClient.post(CHAT_ENDPOINTS.linkCodes, payload).then((res) => res.data),

  LIST_CONNECTED: async (): Promise<ListConnectedChatsResponse> =>
    apiClient.get(CHAT_ENDPOINTS.connected).then((res) => res.data),

  DISCONNECT: async (linkedChatId: string): Promise<DisconnectChatResponse> =>
    apiClient.delete(CHAT_ENDPOINTS.disconnect(linkedChatId)).then((res) => res.data),
};
