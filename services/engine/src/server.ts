import App from "./app.js";
import env from "./config/env.js";
import logger from "./lib/logger.js";
import healthRoute from "./routes/health.route.js";
import authRoute from "./routes/auth.route.js";
import userRoute from "./routes/user.route.js";
import workspaceRoute from "./routes/workspace.route.js";
import { startSocketServer } from "./socket/server.js";
import { startScheduler } from "./cron/scheduler.js";

const app = new App();

app.initializeRoutes([healthRoute, authRoute, userRoute, workspaceRoute]);

async function bootstrap() {
  app.start();
  startSocketServer(env.SOCKET_PORT);
  startScheduler();

  const shutdown = (signal: string) => {
    logger.info(`[engine] received ${signal}; shutting down`);
    process.exit(0);
  };
  process.on("SIGTERM", () => shutdown("SIGTERM"));
  process.on("SIGINT", () => shutdown("SIGINT"));
}

bootstrap();
