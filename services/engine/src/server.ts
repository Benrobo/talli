import App from "./app.js";
import env from "./config/env.js";
import logger from "./lib/logger.js";
import healthRoute from "./routes/health.route.js";
import authRoute from "./routes/auth.route.js";
import userRoute from "./routes/user.route.js";
import chatRoute from "./routes/chat.route.js";
import collectionRoute from "./routes/collection.route.js";
import savingsRoute from "./routes/savings.route.js";
import walletRoute from "./routes/wallet.route.js";
import transferRoute from "./routes/transfer.route.js";
import paymentsRoute from "./routes/payments.route.js";
import transactionsRoute from "./routes/transactions.route.js";
import receiptRoute from "./routes/receipt.route.js";
import webhookRoute from "./routes/webhook.route.js";
import billSplitRoute from "./routes/bill-split.route.js";
import emailPreviewRoute from "./routes/email-preview.route.js";
import { startSocketServer } from "./socket/server.js";
import { startScheduler } from "./cron/scheduler.js";
import type { ServerType } from "@hono/node-server";

const app = new App();

app.initializeRoutes([healthRoute, authRoute, userRoute, chatRoute, collectionRoute, savingsRoute, walletRoute, transferRoute, paymentsRoute, transactionsRoute, receiptRoute, webhookRoute, billSplitRoute]);

if (env.NODE_ENV !== "production") {
  app.app.route("/", emailPreviewRoute);
}

async function bootstrap() {
  const server = app.start();
  startSocketServer(server as ServerType);
  startScheduler();

  const shutdown = (signal: string) => {
    logger.info(`[engine] received ${signal}; shutting down`);
    process.exit(0);
  };
  process.on("SIGTERM", () => shutdown("SIGTERM"));
  process.on("SIGINT", () => shutdown("SIGINT"));
}

bootstrap();
