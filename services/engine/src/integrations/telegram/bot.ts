import { Bot } from "grammy";
import env from "../../config/env.js";
import { TelegramClient } from "./client.js";
import type { TalliContext } from "./types.js";

/**
 * The bot instance and its thin send-client, isolated from handler wiring so
 * services can import `telegram` to send messages without pulling in the handler
 * graph (which imports services back — that would be a cycle). Handler
 * registration and the webhook live in `index.ts`, which imports `bot` from here.
 */
export const bot = new Bot<TalliContext>(env.TELEGRAM_BOT_TOKEN);

export const telegram = new TelegramClient(bot.api);
