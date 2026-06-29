import { webhookCallback } from "grammy";
import env from "../../config/env.js";
import logger from "../../lib/logger.js";
import { bot, telegram } from "./bot.js";
import { handleStart } from "./handlers/start.handler.js";
import { handleDisconnect } from "./handlers/disconnect.handler.js";
import { handleInfo } from "./handlers/info.handler.js";
import { handleBalance } from "./handlers/balance.handler.js";
import { handleReceipt, handleReceiptList } from "./handlers/receipt.handler.js";
import { handleMessage } from "./handlers/message.handler.js";
import { handlePhoto } from "./handlers/photo.handler.js";
import { handleCallback } from "./handlers/callback.handler.js";
import { handleMyChatMember } from "./handlers/membership.handler.js";

export { bot, telegram };

bot.command("start", handleStart);
bot.command("disconnect", handleDisconnect);
bot.command("info", handleInfo);
bot.command("balance", handleBalance);
bot.command("receipt", handleReceipt);
bot.command("receipts", handleReceiptList);
bot.on("my_chat_member", handleMyChatMember);
bot.on("message:photo", handlePhoto);
bot.on("message", handleMessage);
bot.on("callback_query:data", handleCallback);

bot.catch((err) => {
  logger.error(`[telegram] handler error on update ${err.ctx.update.update_id}: ${err.error}`);
});

/** grammY verifies the secret-token header (401 on mismatch); route needs no extra auth. */
export const telegramWebhook = webhookCallback(bot, "hono", {
  secretToken: env.TELEGRAM_WEBHOOK_SECRET,
});
