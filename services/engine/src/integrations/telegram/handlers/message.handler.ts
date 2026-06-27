import env from "../../../config/env.js";
import { chatLinkService } from "../../../services/chat-link.service.js";
import { messages } from "../ui/messages.js";
import { connectTalli } from "../ui/keyboards.js";
import type { TalliContext } from "../types.js";
import { safeReply, isGroupChat } from "./shared.js";

/**
 * Non-command messages. Routes by chat type:
 *
 * - **Private DM:** gate up front — unlinked chats get the Connect prompt, linked
 *   chats fall through to command handling (placeholder for now).
 * - **Group:** with privacy mode on (Talli's default), the bot only receives
 *   group messages that mention it or reply to it, so reaching here means the bot
 *   was addressed. Unlinked groups are told to link first; linked groups fall
 *   through to command handling.
 */
export async function handleMessage(ctx: TalliContext): Promise<void> {
  const chatId = String(ctx.chat!.id);
  const linked = await chatLinkService.findActiveChat("telegram", chatId);

  if (isGroupChat(ctx)) {
    if (!linked) {
      await safeReply(ctx, messages.groupNotLinked);
      return;
    }
    await safeReply(ctx, messages.unrecognized);
    return;
  }

  if (!linked) {
    await safeReply(ctx, messages.notLinked, connectTalli(env.WEB_APP_URL));
    return;
  }
  await safeReply(ctx, messages.unrecognized);
}
