import type { Context, Next } from "hono";
import type { ZodSchema } from "zod";
import sendResponse from "../lib/send-response.js";

/**
 * Parse and validate the JSON request body against a Zod schema.
 * On success the parsed data lives on `c.get("validatedData")`.
 * On failure responds with `400` and the first error message.
 */
export function validateSchema(schema: ZodSchema) {
  return async (c: Context, next: Next) => {
    const body = await c.req.json().catch(() => ({}));
    const result = schema.safeParse(body);
    if (!result.success) {
      const issues = result.error.issues;
      const message = issues[0]?.message ?? "Validation error";
      return sendResponse.error(c, message, 400, result.error.flatten());
    }
    c.set("validatedData", result.data);
    await next();
  };
}

/**
 * Variant that validates query params instead of the body.
 */
export function validateQuery(schema: ZodSchema) {
  return async (c: Context, next: Next) => {
    const query = c.req.query();
    const result = schema.safeParse(query);
    if (!result.success) {
      const issues = result.error.issues;
      const message = issues[0]?.message ?? "Invalid query parameters";
      return sendResponse.error(c, message, 400, result.error.flatten());
    }
    c.set("validatedQuery", result.data);
    await next();
  };
}

/**
 * Variant that validates URL params (e.g. `/users/:id`).
 */
export function validateParams(schema: ZodSchema) {
  return async (c: Context, next: Next) => {
    const params = c.req.param() as Record<string, string>;
    const result = schema.safeParse(params);
    if (!result.success) {
      const issues = result.error.issues;
      const message = issues[0]?.message ?? "Invalid path parameters";
      return sendResponse.error(c, message, 400, result.error.flatten());
    }
    c.set("validatedParams", result.data);
    await next();
  };
}
