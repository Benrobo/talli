import type { InlineKeyboard } from "grammy";
import logger from "../../../lib/logger.js";
import { chatLinkService } from "../../../services/chat-link.service.js";
import { platformUserService } from "../../../services/platform-user.service.js";
import type { DispatchContext } from "../../../services/intent-dispatcher.service.js";
import { GROUP_TELEGRAM_CHAT_TYPES } from "../../../constants/chat-capabilities.js";
import type { TalliContext } from "../types.js";

/**
 * Resolves the linked chat and a ready {@link DispatchContext} for the sender of
 * an update. Returns null when the chat isn't linked, so callers can show the
 * connect prompt. The acting account is the chat's owner ({@link linked.userId}).
 * Shared by the text and photo handlers so context-building stays in one place.
 */
export async function resolveDispatchContext(ctx: TalliContext): Promise<DispatchContext | null> {
  const linked = await chatLinkService.findActiveChat("telegram", String(ctx.chat!.id));
  if (!linked) return null;

  const identity = await platformUserService.upsert({
    platform: "telegram",
    platformUserId: String(ctx.from!.id),
    firstName: ctx.from?.first_name,
    username: ctx.from?.username,
  });

  const isGroup = isGroupChat(ctx);
  return {
    scope: isGroup ? "group" : "private",
    userId: linked.userId,
    linkedChatId: linked.id,
    platform: "telegram",
    senderPlatformId: String(ctx.from!.id),
    senderName: platformUserService.formatName(identity),
    isGroupAdmin: isGroup ? await isSenderAdmin(ctx) : true,
  };
}

/**
 * Reply that never throws. A send failure (chat not found, bot blocked, lost
 * admin rights) must not fail the update, or grammY returns 500 and Telegram
 * retries the same update forever.
 */
export async function safeReply(
  ctx: TalliContext,
  text: string,
  keyboard?: InlineKeyboard
): Promise<void> {
  try {
    await ctx.reply(text, { parse_mode: "Markdown", reply_markup: keyboard });
  } catch (err) {
    const message = (err as Error).message;
    if (message.includes("can't parse entities")) {
      try {
        await ctx.reply(text, { reply_markup: keyboard });
        return;
      } catch (plainErr) {
        logger.error(`[telegram] plain reply failed in chat ${ctx.chat?.id}: ${(plainErr as Error).message}`);
        return;
      }
    }
    logger.error(`[telegram] reply failed in chat ${ctx.chat?.id}: ${message}`);
  }
}

/**
 * Asks a clarification with Telegram `force_reply` so the addressed user's next
 * message is structurally a reply to this question (the bot matches it back by
 * message id). The bot's question is itself a reply to the asker's message, so
 * the input box is naturally anchored to them; we do NOT pass `selective: true`
 * — many clients (desktop, supergroups) silently drop the force-reply box when
 * it's selective, and we already gate the answer server-side by `askedBy`.
 * Returns the sent message id, or null on failure.
 */
export async function safeReplyForceReply(
  ctx: TalliContext,
  text: string
): Promise<number | null> {
  try {
    const sent = await ctx.reply(text, {
      parse_mode: "Markdown",
      reply_parameters: { message_id: ctx.message!.message_id },
      reply_markup: { force_reply: true },
    });
    return sent.message_id;
  } catch (err) {
    logger.error(`[telegram] force_reply failed in chat ${ctx.chat?.id}: ${(err as Error).message}`);
    return null;
  }
}

/**
 * Like {@link safeReply} but sends a photo with the text as its caption. Falls
 * back to a plain text reply if the photo send fails (bad URL, fetch timeout),
 * so the user always gets the message. Captions are capped at 1024 chars.
 */
export async function safeReplyWithPhoto(
  ctx: TalliContext,
  photoUrl: string,
  caption: string,
  keyboard?: InlineKeyboard
): Promise<void> {
  try {
    await ctx.replyWithPhoto(photoUrl, {
      caption,
      parse_mode: "Markdown",
      reply_markup: keyboard,
    });
  } catch (err) {
    logger.error(`[telegram] photo reply failed in chat ${ctx.chat?.id}: ${(err as Error).message}`);
    await safeReply(ctx, caption, keyboard);
  }
}

export function isGroupChat(ctx: TalliContext): boolean {
  const type = ctx.chat?.type;
  return !!type && (GROUP_TELEGRAM_CHAT_TYPES as readonly string[]).includes(type);
}

/**
 * Whether the message sender is an admin/owner of the current chat. Used to
 * gate group linking so only a group admin can bind the group to an account.
 * Returns false on any lookup failure rather than throwing.
 */
export async function isSenderAdmin(ctx: TalliContext): Promise<boolean> {
  if (!ctx.from || !ctx.chat) return false;
  try {
    const member = await ctx.getChatMember(ctx.from.id);
    return member.status === "administrator" || member.status === "creator";
  } catch (err) {
    logger.error(`[telegram] getChatMember failed in ${ctx.chat.id}: ${(err as Error).message}`);
    return false;
  }
}
