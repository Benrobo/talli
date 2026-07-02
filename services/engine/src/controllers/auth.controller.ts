import type { Context } from "hono";
import { getCookie } from "hono/cookie";
import { AUTH_COOKIE_NAME, REFRESH_COOKIE_NAME } from "@app/shared/constants";
import env from "../config/env.js";
import { COOKIE_SECURE } from "../config/internal-config.js";
import { cookieManager } from "../lib/cookie-manager.js";
import sendResponse from "../lib/send-response.js";
import { UnauthorizedException } from "../lib/exception.js";
import type { TokenPair } from "../lib/jwt.js";
import { authService } from "../services/auth.service.js";
import type { RequestOtpInput, UpdateProfileInput, VerifyOtpInput } from "../schemas/auth.schema.js";

class AuthController {
  async requestOtp(ctx: Context) {
    const { email, mode } = ctx.get("validatedData") as RequestOtpInput;
    await authService.requestOtp(email, mode);
    return sendResponse.success(ctx, "Verification code sent", 200, {
      email,
      expiresIn: 600,
    });
  }

  async verifyOtp(ctx: Context) {
    const { email, code, name } = ctx.get("validatedData") as VerifyOtpInput;
    const { user, tokens } = await authService.verifyOtp(email, code, {
      userAgent: ctx.req.header("user-agent") ?? null,
      ipAddress: ctx.req.header("x-forwarded-for") ?? null,
    }, name);
    this.setAuthCookies(ctx, tokens);
    return sendResponse.success(ctx, "Signed in", 200, { user, ...tokens });
  }

  async refresh(ctx: Context) {
    const bodyToken = (ctx.get("validatedData") as { refreshToken?: string } | undefined)?.refreshToken;
    const token = bodyToken ?? getCookie(ctx, REFRESH_COOKIE_NAME);
    if (!token) throw new UnauthorizedException("Missing refresh token");

    const tokens = await authService.refresh(token);
    this.setAuthCookies(ctx, tokens);
    return sendResponse.success(ctx, "Token refreshed", 200, { ...tokens });
  }

  async me(ctx: Context) {
    const user = ctx.get("user") as AuthUser | undefined;
    if (!user) throw new UnauthorizedException();
    return sendResponse.success(ctx, null, 200, { user });
  }

  async updateMe(ctx: Context) {
    const userId = ctx.get("userId") as string;
    const { name } = ctx.get("validatedData") as UpdateProfileInput;
    const accessToken =
      ctx.req.header("Authorization")?.replace("Bearer ", "") ?? getCookie(ctx, AUTH_COOKIE_NAME);
    const user = await authService.updateProfile(userId, name, accessToken);
    return sendResponse.success(ctx, "Profile updated", 200, { user });
  }

  async logout(ctx: Context) {
    const token = ctx.req.header("Authorization")?.replace("Bearer ", "")
      ?? getCookie(ctx, AUTH_COOKIE_NAME);
    if (token) await authService.logout(token);

    cookieManager.clearCookie(ctx, AUTH_COOKIE_NAME, {
      domain: env.COOKIE_DOMAIN,
      secure: COOKIE_SECURE,
    });
    cookieManager.clearCookie(ctx, REFRESH_COOKIE_NAME, {
      domain: env.COOKIE_DOMAIN,
      secure: COOKIE_SECURE,
    });
    return sendResponse.success(ctx, "Signed out", 200, null);
  }

  private setAuthCookies(ctx: Context, tokens: TokenPair) {
    cookieManager.setCookie(ctx, AUTH_COOKIE_NAME, tokens.accessToken, {
      maxAge: env.JWT_ACCESS_TOKEN_TTL,
      sameSite: "lax",
      secure: COOKIE_SECURE,
      domain: env.COOKIE_DOMAIN,
    });
    cookieManager.setCookie(ctx, REFRESH_COOKIE_NAME, tokens.refreshToken, {
      maxAge: env.JWT_REFRESH_TOKEN_TTL,
      sameSite: "lax",
      secure: COOKIE_SECURE,
      domain: env.COOKIE_DOMAIN,
    });
  }
}

interface AuthUser {
  id: string;
  email: string;
  name: string | null;
  avatarUrl: string | null;
}

export const authController = new AuthController();
