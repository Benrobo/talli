import env from "../../../config/env.js";
import { chatLinkService } from "../../../services/chat-link.service.js";
import { intentDispatcherService, type DispatchContext, type DispatchResult } from "../../../services/intent-dispatcher.service.js";
import { botCommandService } from "../../../services/bot-command.service.js";
import { platformUserService } from "../../../services/platform-user.service.js";
import { messages } from "../ui/messages.js";
import { connectTalli } from "../ui/keyboards.js";
import type { TalliContext } from "../types.js";
import { safeReply, safeReplyForceReply, isGroupChat, isSenderAdmin } from "./shared.js";
import { telegram } from "../bot.js";

const MENTION = new RegExp(`@${env.TELEGRAM_BOT_USERNAME}`, "gi");

/**
 * True when this message is a reply that quotes one of Talli's OWN messages.
 * This is the natural "I'm talking to you" signal in a group — replying to the
 * bot addresses the bot, no @mention or stored message id needed. `ctx.me` is
 * the bot's own User (populated by grammY), so we compare the quoted author's id.
 */
function isReplyToBot(ctx: TalliContext): boolean {
  const repliedTo = ctx.message?.reply_to_message;
  return !!repliedTo?.from?.is_bot && repliedTo.from.id === ctx.me?.id;
}

/**
 * Non-command messages. In a group the bot engages when it's @mentioned OR when
 * the message replies to one of the bot's own messages — replying to Talli means
 * you're talking to Talli, so no bookkeeping is needed. In a DM it engages on
 * everything. The quoted Talli message is passed to the agent as context so it
 * knows what's being answered. An unlinked chat is told to connect first.
 */
export async function handleMessage(ctx: TalliContext): Promise<void> {
  const chatId = String(ctx.chat!.id);
  const text = ctx.message?.text?.replace(MENTION, "").trim();
  if (!text) return;

  console.log(`🔍 [telegram] msg chat=${chatId}: ${JSON.stringify({
    message: ctx.message,
    me: ctx.me
  }, null, 2)}`)

  const isGroup = isGroupChat(ctx);
  const mentioned = !!ctx.message?.text?.match(MENTION);
  const replyToBot = isReplyToBot(ctx);

  const linked = await chatLinkService.findActiveChat("telegram", chatId);
  if (!linked) {
    if (isGroup && !mentioned && !replyToBot) return;
    await safeReply(
      ctx,
      isGroup ? messages.groupNotLinked : messages.notLinked,
      isGroup ? undefined : connectTalli(env.WEB_APP_URL)
    );
    return;
  }

  if (isGroup && !mentioned && !replyToBot) return;

  const senderId = String(ctx.from!.id);
  const identity = await platformUserService.upsert({
    platform: "telegram",
    platformUserId: senderId,
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

  const pending = await botCommandService.findPendingForReply(
    linked.id,
    senderId,
    isGroup,
    ctx.message?.reply_to_message?.message_id
  );

  const quoted = replyToBot ? ctx.message?.reply_to_message?.text?.trim() : undefined;
  console.log(`🔍 [telegram] msg chat=${chatId}: ${JSON.stringify({
    text,
    pending,
    quoted,
    dispatchCtx,
  }, null, 2)}`)

  const result = pending
    ? await intentDispatcherService.continue(pending.id, text, dispatchCtx)
    : await intentDispatcherService.handleMessageAgent(text, dispatchCtx, quoted);

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

  if (result.photo) {
    const text = result.text?.trim();
    const caption = text && text.length <= 1024 ? text : result.photo.caption;
    const sent = await telegram.sendPhoto(
      String(ctx.chat!.id),
      result.photo.image,
      caption,
      result.keyboard
    );
    if (sent) return;
    await safeReply(ctx, messages.receiptPhotoBlocked, result.keyboard);
    return;
  }

  await safeReply(ctx, result.text, result.keyboard);
}
