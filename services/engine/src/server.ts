import App from "./app.js";
import env from "./config/env.js";
import logger from "./lib/logger.js";
import healthRoute from "./routes/health.route.js";
import authRoute from "./routes/auth.route.js";
import userRoute from "./routes/user.route.js";
import workspaceRoute from "./routes/workspace.route.js";
import chatRoute from "./routes/chat.route.js";
import collectionRoute from "./routes/collection.route.js";
import walletRoute from "./routes/wallet.route.js";
import webhookRoute from "./routes/webhook.route.js";
import { startSocketServer } from "./socket/server.js";
import { startScheduler } from "./cron/scheduler.js";
import type { ServerType } from "@hono/node-server";

const app = new App();

app.initializeRoutes([healthRoute, authRoute, userRoute, workspaceRoute, chatRoute, collectionRoute, walletRoute, webhookRoute]);

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
