import type { Context } from "hono";
import { deleteCookie, setCookie } from "hono/cookie";

type CookieSameSite = "strict" | "lax" | "none";

interface CookieOptions {
  httpOnly?: boolean;
  secure?: boolean;
  sameSite?: CookieSameSite;
  maxAge?: number;
  domain?: string;
  path?: string;
}

/**
 * Thin wrapper over Hono's cookie helpers with safe defaults
 * (httpOnly, lax, path "/"). Use for auth/session cookies.
 */
export class CookieManager {
  setCookie(ctx: Context, name: string, value: string, options: CookieOptions = {}) {
    setCookie(ctx, name, value, {
      httpOnly: options.httpOnly ?? true,
      secure: options.secure ?? false,
      sameSite: options.sameSite ?? "lax",
      path: options.path ?? "/",
      ...(options.maxAge !== undefined ? { maxAge: options.maxAge } : {}),
      ...(options.domain ? { domain: options.domain } : {}),
    });
  }

  clearCookie(
    ctx: Context,
    name: string,
    options: Omit<CookieOptions, "maxAge"> = {}
  ) {
    deleteCookie(ctx, name, {
      httpOnly: options.httpOnly ?? true,
      secure: options.secure ?? false,
      sameSite: options.sameSite ?? "lax",
      path: options.path ?? "/",
      ...(options.domain ? { domain: options.domain } : {}),
    });
  }
}

export const cookieManager = new CookieManager();
