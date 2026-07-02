import { chatLinkService } from "../../../services/chat-link.service.js";
import { messages } from "../ui/messages.js";
import type { TalliContext } from "../types.js";
import { safeReply, isGroupChat, isSenderAdmin } from "./shared.js";

/**
 * `/disconnect` — unlinks the chat from its account. In a group only an admin
 * may do it, so a member can't sever the group's connection.
 */
export async function handleDisconnect(ctx: TalliContext): Promise<void> {
  const isAdmin = await isSenderAdmin(ctx);
  if (isGroupChat(ctx) && !isAdmin) {
    await safeReply(ctx, messages.disconnectAdminOnly);
    return;
  }

  const ok = await chatLinkService.disconnectByChat("telegram", String(ctx.chat!.id));
  await safeReply(ctx, ok ? messages.disconnected : messages.notConnected);
}
