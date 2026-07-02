import cron from "node-cron";
import logger from "../lib/logger.js";
import { reconcilePayments } from "./reconcile-payments.js";
import { reconcileTransfers } from "./reconcile-transfers.js";


export function startScheduler() {
  cron.schedule("*/15 * * * *", async () => {
    logger.info("[cron] heartbeat");
  });

  // Every 5 seconds, reconcile inbound payments
  cron.schedule("*/5 * * * * *", async () => {
    try {
      await reconcilePayments();
    } catch (err) {
      logger.error("[cron] reconcilePayments failed:", err);
    }
  });

  // Every 10 seconds, reconcile outbound transfers (settle slower, up to ~3 min)
  cron.schedule("*/10 * * * * *", async () => {
    try {
      await reconcileTransfers();
    } catch (err) {
      logger.error("[cron] reconcileTransfers failed:", err);
    }
  });

  logger.info("[cron] scheduler started");
}
