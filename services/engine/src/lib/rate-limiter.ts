import type { Context, Next } from "hono";
import redis from "./redis.js";
import { TooManyRequestsException } from "./exception.js";

interface RateLimitOptions {
  windowMs: number;
  max: number;
  keyPrefix?: string;
  bodyField?: string;
}

/**
 * Distributed rate limiter backed by Redis INCR + PEXPIRE.
 *
 * Two identifier strategies:
 *
 *  - **IP-based** (default): keys off `x-forwarded-for` or `x-real-ip`.
 *  - **Body-field**: pass `bodyField: "email"` to throttle per-email.
 *    The body is consumed once and re-injected for downstream handlers.
 *
 * Usage:
 *
 * ```ts
 * const rl = new RateLimiter();
 * router.post(
 *   "/auth/otp",
 *   rl.rateLimit({ windowMs: 60_000, max: 3, keyPrefix: "otp", bodyField: "email" }),
 *   useCatchErrors(controller.requestOtp)
 * );
 * ```
 */
export default class RateLimiter {
  private redisKey(identifier: string, keyPrefix?: string): string {
    return `rl:${keyPrefix ?? "global"}:${identifier}`;
  }

  private async canMakeRequest(
    identifier: string,
    windowMs: number,
    max: number,
    keyPrefix?: string
  ): Promise<boolean> {
    const key = this.redisKey(identifier, keyPrefix);
    const current = await redis.incr(key);
    if (current === 1) {
      await redis.pexpire(key, windowMs);
    }
    return current <= max;
  }

  public rateLimit({ windowMs, max, keyPrefix, bodyField }: RateLimitOptions) {
    return async (c: Context, next: Next) => {
      let identifier: string;

      if (bodyField) {
        const body = await c.req.json();
        identifier = String(body?.[bodyField] ?? "unknown").toLowerCase();
        c.set("validatedData", body);
      } else {
        identifier =
          c.req.header("x-forwarded-for") ??
          c.req.header("x-real-ip") ??
          "unknown";
      }

      const ok = await this.canMakeRequest(identifier, windowMs, max, keyPrefix);
      if (!ok) {
        throw new TooManyRequestsException("Too many requests, try again later");
      }

      await next();
    };
  }
}

export const rateLimiter = new RateLimiter();
