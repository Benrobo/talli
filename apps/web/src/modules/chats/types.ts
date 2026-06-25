/**
 * Types for the Linked chats module.
 */

export type ChatPlatform = "whatsapp" | "telegram";

export interface LinkedChat {
  id: string;
  platform: ChatPlatform;
  title: string;
  meta: string;
}
