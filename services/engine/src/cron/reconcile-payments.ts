import { pendingPaymentService } from "../services/pending-payment.service.js";
import logger from "../lib/logger.js";

/**
 * Polls pending bank-transfer payments and settles the ones that have landed.
 * This is v2's reconciliation in place of webhooks. Each item is isolated so one
 * failure doesn't stop the batch.
 */
export async function reconcilePayments(): Promise<void> {
  const pending = await pendingPaymentService.listPollable();
  if (pending.length === 0) return;

  let settled = 0;
  for (const item of pending) {
    try {
      const done = await pendingPaymentService.reconcile(item.id);
      if (done) settled += 1;
    } catch (err) {
      logger.error(`[cron] reconcile ${item.orderRefId} failed: ${(err as Error).message}`);
    }
  }

  logger.info(`[cron] reconciled ${settled}/${pending.length} pending payments`);
}
