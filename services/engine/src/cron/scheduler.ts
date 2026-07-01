import cron from "node-cron";
import logger from "../lib/logger.js";
import { processNotifications } from "./process-notifications.js";
import { reconcilePayments } from "./reconcile-payments.js";

/**
 * Boot the in-process cron scheduler. Each job is wrapped in try/catch so
 * a single failure cannot crash the runtime.
 */
export function startScheduler() {
  cron.schedule("*/15 * * * *", async () => {
    logger.info("[cron] heartbeat");
  });

  cron.schedule("*/10 * * * * *", async () => {
    try {
      await processNotifications();
    } catch (err) {
      logger.error("[cron] processNotifications failed:", err);
    }
  });

  // Every 5 seconds, reconcile payments
  cron.schedule("*/5 * * * * *", async () => {
    try {
      await reconcilePayments();
    } catch (err) {
      logger.error("[cron] reconcilePayments failed:", err);
    }
  });

  logger.info("[cron] scheduler started");
}
