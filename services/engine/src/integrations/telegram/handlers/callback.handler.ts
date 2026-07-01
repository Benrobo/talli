import logger from "../../../lib/logger.js";
import { decodeCallback } from "../types.js";
import type { TalliContext } from "../types.js";

/**
 * Inline-button taps. Decodes the `action:arg` callback data and dispatches.
 * Payment / confirm-cancel flows hook in here by action. Always answers the
 * query so the client's loading spinner clears.
 */
export async function handleCallback(ctx: TalliContext): Promise<void> {
  const { action, arg } = decodeCallback(ctx.callbackQuery!.data!);
  logger.debug(`[telegram] callback action=${action} arg=${arg}`);

  try {
    await ctx.answerCallbackQuery();
  } catch (err) {
    logger.error(`[telegram] answerCallbackQuery failed: ${(err as Error).message}`);
  }
}
