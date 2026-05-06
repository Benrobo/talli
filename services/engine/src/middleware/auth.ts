import type { Context } from "hono";
import { getCookie } from "hono/cookie";
import { AUTH_COOKIE_NAME } from "@app/shared/constants";
import prisma from "../prisma/index.js";
import jwtService from "../lib/jwt.js";
import cacheAdapter from "../lib/cache-adapter.js";
import {
  ForbiddenException,
  UnauthorizedException,
} from "../lib/exception.js";

const SESSION_CACHE_TTL = 5 * 60;

interface AuthedUser {
  id: string;
  email: string;
  name: string | null;
  avatarUrl: string | null;
  role: string;
}

async function loadAuthUser(token: string): Promise<AuthedUser> {
  const cached = await cacheAdapter.get(`session:${token}`, true);
  if (cached) {
    return JSON.parse(cached) as AuthedUser;
  }

  let payload;
  try {
    payload = jwtService.verifyAccessToken(token);
  } catch {
    throw new UnauthorizedException("Invalid token");
  }

  const session = await prisma.authSession.findFirst({
    where: {
      id: payload.sessionId,
      userId: payload.userId,
      expiresAt: { gt: new Date() },
    },
  });
  if (!session) throw new UnauthorizedException("Session expired");

  const user = await prisma.user.findUnique({ where: { id: payload.userId } });
  if (!user) throw new UnauthorizedException("User not found");

  const authed: AuthedUser = {
    id: user.id,
    email: user.email,
    name: user.name,
    avatarUrl: user.avatarUrl,
    role: user.role,
  };

  await cacheAdapter.set(`session:${token}`, JSON.stringify(authed), SESSION_CACHE_TTL, true);
  return authed;
}

async function verifyAuth(c: Context) {
  const header = c.req.header("Authorization");
  const bearer = header?.startsWith("Bearer ") ? header.slice(7) : null;
  const cookieToken = getCookie(c, AUTH_COOKIE_NAME);
  const token = bearer ?? cookieToken;

  if (!token) {
    throw new UnauthorizedException();
  }

  const user = await loadAuthUser(token);
  c.set("user", user);
  c.set("userId", user.id);
}

/**
 * Wrap a handler so it only runs when an authenticated session is present.
 * The user object is attached via `c.set("user", ...)` and is reachable
 * from any downstream handler with `c.get("user")`.
 */
export function isAuthenticated<T extends (ctx: Context) => unknown>(handler: T) {
  return async function (ctx: Context) {
    await verifyAuth(ctx);
    return handler(ctx);
  } as T;
}

/**
 * Allow only users whose `role` matches one of the provided roles.
 * Use after `isAuthenticated` (or compose them).
 */
export function requireAdmin(roles: string[] = ["admin", "super_admin"]) {
  return async (c: Context, next: () => Promise<void>) => {
    await verifyAuth(c);
    const user = c.get("user") as AuthedUser | undefined;
    if (!user || !roles.includes(user.role)) {
      throw new ForbiddenException("Admin access required");
    }
    await next();
  };
}
