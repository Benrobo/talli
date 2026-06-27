import logger from "../../../lib/logger.js";
import { CALLBACK_ACTION, decodeCallback } from "../types.js";
import type { TalliContext } from "../types.js";
import { handleInfo } from "./info.handler.js";
import { handleDisconnect } from "./disconnect.handler.js";

/**
 * Inline-button taps. Decodes the `action:arg` callback data and dispatches.
 * Always answers the query first so the client's loading spinner clears.
 */
export async function handleCallback(ctx: TalliContext): Promise<void> {
  const { action, arg } = decodeCallback(ctx.callbackQuery!.data!);
  logger.debug(`[telegram] callback action=${action} arg=${arg}`);

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
  }
}
