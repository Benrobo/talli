import logger from "../../../lib/logger.js";
import { CALLBACK_ACTION, decodeCallback } from "../types.js";
import type { TalliContext } from "../types.js";
import { handleInfo } from "./info.handler.js";
import { handleDisconnect } from "./disconnect.handler.js";
import { handlePay } from "./pay.handler.js";
import { handleConfirm } from "./confirm.handler.js";
import { handleReceiptCallback } from "./receipt.handler.js";
import { handleSelectCollection } from "./pay.handler.js";

/**
 * Inline-button taps. Decodes the `action:arg` callback data and dispatches.
 * The `pay` action answers its own query (it returns a URL to open), so it must
 * run before the generic ack; everything else gets a plain ack.
 */
export async function handleCallback(ctx: TalliContext): Promise<void> {
  const { action, arg } = decodeCallback(ctx.callbackQuery!.data!);
  logger.debug(`[telegram] callback action=${action} arg=${arg}`);

  if (action === CALLBACK_ACTION.pay) {
    await handlePay(ctx, arg);
    return;
  }

  try {
    await ctx.answerCallbackQuery();
  } catch (err) {
    logger.error(`[telegram] answerCallbackQuery failed: ${(err as Error).message}`);
  }

  switch (action) {
    case CALLBACK_ACTION.info:
      await handleInfo(ctx);
      break;
    case CALLBACK_ACTION.disconnect:
      await handleDisconnect(ctx);
      break;
    case CALLBACK_ACTION.confirm:
      await handleConfirm(ctx, arg, "confirm");
      break;
    case CALLBACK_ACTION.cancel:
      await handleConfirm(ctx, arg, "cancel");
      break;
    case CALLBACK_ACTION.receipt:
      await handleReceiptCallback(ctx, arg);
      break;
    case CALLBACK_ACTION.selectCollection:
      await handleSelectCollection(ctx, arg);
      break;
  }
}
