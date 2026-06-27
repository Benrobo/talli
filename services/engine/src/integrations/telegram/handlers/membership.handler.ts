import { chatLinkService } from "../../../services/chat-link.service.js";
import { messages } from "../ui/messages.js";
import type { TalliContext } from "../types.js";
import { safeReply, isGroupChat } from "./shared.js";

const PRESENT = new Set(["member", "administrator", "creator"]);

/**
 * Fires on `my_chat_member` — the bot's own membership changing. When the bot is
 * added to a group it posts a short intro telling an admin how to link the group
 * (there is no other moment we're guaranteed to get; group messages only reach
 * us once the bot is mentioned). Ignores removals and non-group changes.
 */
export async function handleMyChatMember(ctx: TalliContext): Promise<void> {
  if (!isGroupChat(ctx)) return;

  const update = ctx.myChatMember!;
  const wasPresent = PRESENT.has(update.old_chat_member.status);
  const isPresent = PRESENT.has(update.new_chat_member.status);
  if (wasPresent || !isPresent) {
    console.log("myChatMember update ignored");
    return
  };

  const linked = await chatLinkService.findActiveChat("telegram", String(ctx.chat!.id));
  await safeReply(ctx, linked ? messages.groupReconnected : messages.groupAdded);
}
