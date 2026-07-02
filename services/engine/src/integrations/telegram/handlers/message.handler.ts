import env from "../../../config/env.js";
import { chatLinkService } from "../../../services/chat-link.service.js";
import { intentDispatcherService, type DispatchContext, type DispatchResult } from "../../../services/intent-dispatcher.service.js";
import { botCommandService } from "../../../services/bot-command.service.js";
import { platformUserService } from "../../../services/platform-user.service.js";
import { messages } from "../ui/messages.js";
import { connectTalli } from "../ui/keyboards.js";
import type { TalliContext } from "../types.js";
import { safeReply, safeReplyForceReply, isGroupChat, isSenderAdmin } from "./shared.js";
import logger from "../../../lib/logger.js";

const MENTION = new RegExp(`@${env.TELEGRAM_BOT_USERNAME}`, "gi");

/**
 * Non-command messages. In a group the bot acts when it is mentioned OR when the
 * message is a reply to one of the bot's own messages (e.g. answering a
 * force_reply clarification, which carries no @mention); in a DM it acts on every
 * message. A linked chat's text is parsed into an intent and run through the
 * dispatcher; an unlinked chat is told to connect first.
 */
export async function handleMessage(ctx: TalliContext): Promise<void> {
  const chatId = String(ctx.chat!.id);
  const text = ctx.message?.text?.replace(MENTION, "").trim();
  if (!text) return;

  const isGroup = isGroupChat(ctx);
  const mentioned = !!ctx.message?.text?.match(MENTION);

  const linked = await chatLinkService.findActiveChat("telegram", chatId);
  if (!linked) {
    // Only answer an explicit mention in an unlinked group; ignore chatter/replies.
    if (isGroup && !mentioned) return;
    await safeReply(
      ctx,
      isGroup ? messages.groupNotLinked : messages.notLinked,
      isGroup ? undefined : connectTalli(env.WEB_APP_URL)
    );
    return;
  }

  const senderId = String(ctx.from!.id);

  // A reply only counts as a command when it answers one of Talli's OWN pending
  // clarifications. A bare reply that just quotes an old Talli message must NOT
  // re-trigger the bot — otherwise Talli replies to itself in a loop.
  const pending = await botCommandService.findPendingForReply(
    linked.id,
    senderId,
    isGroup,
    ctx.message?.reply_to_message?.message_id
  );


  // Talli act only when @-mentioned
  if (isGroup && !mentioned && !pending) return;

  const identity = await platformUserService.upsert({
    platform: "telegram",
    platformUserId: String(ctx.from!.id),
    firstName: ctx.from?.first_name,
    username: ctx.from?.username,
  });

  const dispatchCtx: DispatchContext = {
    scope: isGroup ? "group" : "private",
    userId: linked.userId,
    linkedChatId: linked.id,
    platform: "telegram",
    senderPlatformId: senderId,
    senderName: platformUserService.formatName(identity),
    isGroupAdmin: isGroup ? await isSenderAdmin(ctx) : true,
  };

  const result = pending
    ? await intentDispatcherService.continue(pending.id, text, dispatchCtx)
    : await intentDispatcherService.handleMessageAgent(text, dispatchCtx);

  await render(ctx, result, isGroup);
}

/**
 * Sends a dispatch result. A `clarify` result is a question we need an answer to:
 * in a group we ask with force_reply and record the sent message id so the user's
 * reply can be matched back; in a DM the next message is the answer, so a plain
 * reply suffices. Everything else is a normal reply (text + optional confirm card).
 */
async function render(ctx: TalliContext, result: DispatchResult, isGroup: boolean): Promise<void> {
  if (result.clarify && isGroup) {
    const messageId = await safeReplyForceReply(ctx, result.text);
    if (messageId !== null) {
      await botCommandService.setClarifyMessageId(result.clarify.commandId, messageId);
    }
    return;
  }
  await safeReply(ctx, result.text, result.keyboard);
}
