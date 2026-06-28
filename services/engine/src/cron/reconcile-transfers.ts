import prisma from "../prisma/index.js";
import { transferService } from "../services/transfer.service.js";
import { telegram } from "../integrations/telegram/bot.js";
import { messages } from "../integrations/telegram/ui/messages.js";
import logger from "../lib/logger.js";

/**
 * Polls pending OUTBOUND transfers and settles each to a final state — Nomba's
 * initial transfer response isn't authoritative (PENDING_BILLING / NEW), so we
 * requery until SUCCESS or REFUND. On settle we notify the initiator's Telegram
 * DM if they have one (bot-initiated sends); REST-initiated sends just settle and
 * are read back via the transfer-history endpoint. Each item is isolated.
 */
export async function reconcileTransfers(): Promise<void> {
  const pending = await transferService.listPendingTransfers();
  if (pending.length === 0) return;

  let settled = 0;
  for (const item of pending) {
    try {
      const result = await transferService.reconcileTransfer(item.id);
      if (!result || result.status === "pending") continue;
      settled += 1;
      await notify(result);
    } catch (err) {
      logger.error(`[cron] reconcile transfer ${item.merchantTxRef} failed: ${(err as Error).message}`);
    }
  }

  logger.info(`[cron] settled ${settled}/${pending.length} pending transfers`);
}

/** Best-effort DM to the initiator when a transfer reaches a terminal state. */
async function notify(transfer: {
  status: string;
  createdByPlatformUserId: string | null;
  accountName: string;
  amount: number;
}): Promise<void> {
  if (!transfer.createdByPlatformUserId) return;

  const chat = await prisma.linkedChat.findFirst({
    where: {
      platform: "telegram",
      chatType: "private",
      platformUserId: transfer.createdByPlatformUserId,
      status: "active",
    },
    select: { platformChatId: true },
  });
  if (!chat) return;

  const text =
    transfer.status === "sent"
      ? messages.transferSettled(transfer.accountName, transfer.amount)
      : messages.transferRefunded(transfer.accountName, transfer.amount);
  await telegram.sendMessage(chat.platformChatId, text);
}
