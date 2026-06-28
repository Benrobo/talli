import { InputFile } from "grammy";
import type { Api } from "grammy";
import type { InlineKeyboard } from "grammy";
import logger from "../../lib/logger.js";

/**
 * Thin wrapper over grammY's `bot.api` so services send without importing
 * grammY. Logs and swallows send failures so a failed notification can't break
 * the surrounding flow; call `bot.api` directly when you need the throw.
 */
export class TelegramClient {
  constructor(private readonly api: Api) {}

  async sendMessage(
    chatId: number | string,
    text: string,
    keyboard?: InlineKeyboard
  ): Promise<void> {
    try {
      await this.api.sendMessage(chatId, text, {
        parse_mode: "Markdown",
        reply_markup: keyboard,
      });
    } catch (err) {
      logger.error(`[telegram] sendMessage to ${chatId} failed: ${(err as Error).message}`);
    }
  }

  async sendPhoto(
    chatId: number | string,
    photo: Buffer,
    caption?: string,
    filename = "receipt.png"
  ): Promise<void> {
    try {
      await this.api.sendPhoto(chatId, new InputFile(photo, filename), {
        caption,
        parse_mode: "Markdown",
      });
    } catch (err) {
      logger.error(`[telegram] sendPhoto to ${chatId} failed: ${(err as Error).message}`);
    }
  }

  async answerCallback(
    callbackQueryId: string,
    options?: { text?: string; url?: string }
  ): Promise<void> {
    try {
      await this.api.answerCallbackQuery(callbackQueryId, options);
    } catch (err) {
      logger.error(`[telegram] answerCallbackQuery failed: ${(err as Error).message}`);
    }
  }
}
