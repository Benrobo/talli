import type { InlineKeyboard } from "grammy";
import logger from "../../../lib/logger.js";
import type { TalliContext } from "../types.js";

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
    logger.error(`[telegram] reply failed in chat ${ctx.chat?.id}: ${(err as Error).message}`);
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
  return ctx.chat?.type === "group" || ctx.chat?.type === "supergroup";
}

/**
 * Whether the message sender is an admin/owner of the current chat. Used to
 * gate group linking so only a group admin can bind the group to a workspace.
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
