import type { Context } from "hono";
import type { ContentfulStatusCode } from "hono/utils/http-status";

/**
 * Standardized JSON envelope for successful and error responses.
 * Every route in this engine returns one of these shapes.
 */
class SendResponse {
  success<T>(
    ctx: Context,
    message: string | null,
    statusCode: ContentfulStatusCode,
    data?: T
  ) {
    return ctx.json(
      {
        ...(message ? { message } : {}),
        data,
      },
      statusCode
    );
  }

  error(
    ctx: Context,
    message: string,
    statusCode: ContentfulStatusCode,
    data?: unknown
  ) {
    return ctx.json({ message, data }, statusCode);
  }
}

export const sendResponse = new SendResponse();
export default sendResponse;
