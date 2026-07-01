import { serve, type ServerType } from "@hono/node-server";
import { Hono } from "hono";
import { cors } from "hono/cors";
import { CORS_ORIGINS } from "./config/internal-config.js";
import env from "./config/env.js";
import { requestLogger } from "./middleware/request-logger.js";
import logger from "./lib/logger.js";
import { modelKitRouter } from "./config/modelkit.config.js";

/**
 * Hono application wrapper. Construct the instance, register middleware
 * once, then call `initializeRoutes(...)` with each Hono router. Mirrors
 * the pattern used across brandowl / scribe / savi / bounta / custo.
 */
export default class App {
  public app: Hono;
  public port: number;
  private server: ServerType | null = null;

  constructor() {
    this.app = new Hono();
    this.port = env.PORT;
    this.initializeMiddlewares();
  }

  initializeMiddlewares() {
    this.app.use(requestLogger);
    this.app.use(
      "*",
      cors({
        origin: CORS_ORIGINS,
        exposeHeaders: ["Content-Length"],
        allowMethods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
        credentials: true,
        maxAge: 600,
      })
    );
    this.app.options("*", (c) => c.text("", 200));
  }

  initializeRoutes(routers: Hono[]) {
    if (env.OPENROUTER_API_KEY) {
      // this.app.use("/api/modelkit/*", requireAdmin(["admin", "super_admin"]));
      this.app.route("/api/modelkit", modelKitRouter);
    }

    for (const router of routers) {
      this.app.route("/api", router);
    }

    this.app.get("/", (c) =>
      c.json({ message: "Engine is running", env: env.NODE_ENV })
    );

    this.app.notFound((c) => c.json({ message: "Not Found" }, 404));

    this.app.onError((err, c) => {
      logger.error("[onError]", err);
      return c.json({ message: err.message || "Internal Server Error" }, 500);
    });
  }

  start(): ServerType {
    this.server = serve({
      fetch: this.app.fetch,
      port: this.port,
    });
    logger.info(`[engine] http://localhost:${this.port}`);
    return this.server;
  }
}
