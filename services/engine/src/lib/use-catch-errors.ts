import type { Context } from "hono";
import type { ContentfulStatusCode } from "hono/utils/http-status";
import { Prisma } from "@prisma/client";
import { HttpException } from "./exception.js";
import sendResponse from "./send-response.js";
import logger from "./logger.js";

type Handler = (ctx: Context) => Promise<Response> | Response;

/**
 * Wraps a Hono handler so any thrown `HttpException` becomes a JSON error
 * response with the right status code. Prisma errors are masked as 500s.
 *
 * Usage:
 *
 * ```ts
 * router.post("/widgets", useCatchErrors(isAuthenticated(controller.create)));
 * ```
 */
export default function useCatchErrors(fn: Handler) {
  return async function (ctx: Context) {
    try {
      return await fn(ctx);
    } catch (err) {
      const e = err as Error & { code?: string };
      logger.error(`[error] ${ctx.req.method} ${ctx.req.path}: ${e?.message}`);
      logger.error(e);

      if (
        err instanceof Prisma.PrismaClientKnownRequestError ||
        err instanceof Prisma.PrismaClientUnknownRequestError ||
        err instanceof Prisma.PrismaClientValidationError
      ) {
        return sendResponse.error(ctx, "Internal Server Error", 500);
      }

      if (err instanceof HttpException) {
        return sendResponse.error(
          ctx,
          err.message,
          err.statusCode as ContentfulStatusCode
        );
      }

      return sendResponse.error(ctx, "Internal Server Error", 500);
    }
  };
}
