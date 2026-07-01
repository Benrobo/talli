import type { Context, Next } from "hono";
import logger from "../lib/logger.js";

/**
 * Log every incoming request with method, path, status code, and duration.
 */
export async function requestLogger(c: Context, next: Next) {
  const start = Date.now();
  await next();
  const ms = Date.now() - start;
  logger.info(`${c.req.method} ${c.req.path} ${c.res.status} ${ms}ms`);
}
