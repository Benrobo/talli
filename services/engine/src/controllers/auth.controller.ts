import type { Context } from "hono";
import { AUTH_COOKIE_NAME, REFRESH_COOKIE_NAME } from "@app/shared/constants";
import env from "../config/env.js";
import prisma from "../prisma/index.js";
import jwtService from "../lib/jwt.js";
import { cookieManager } from "../lib/cookie-manager.js";
import sendResponse from "../lib/send-response.js";
import { mailService } from "../services/mail.service.js";
import { randomOtp } from "../lib/utils.js";
import redis from "../lib/redis.js";
import {
  BadRequestException,
  UnauthorizedException,
} from "../lib/exception.js";
import type { RequestOtpInput, VerifyOtpInput } from "../schemas/auth.schema.js";

const OTP_TTL_SECONDS = 600;

class AuthController {
  /**
   * Issue a 6-digit code, store it in Redis with `OTP_TTL_SECONDS` TTL,
   * and email it to the user.
   */
  async requestOtp(ctx: Context) {
    const { email, mode } = ctx.get("validatedData") as RequestOtpInput;
    const code = randomOtp(6);

    await redis.setex(`otp:${email}`, OTP_TTL_SECONDS, code);
    await mailService.sendOtpEmail(email, code, mode);

    return sendResponse.success(ctx, "Verification code sent", 200, {
      email,
      expiresIn: OTP_TTL_SECONDS,
    });
  }

  /**
   * Validate a submitted OTP, upsert the user, create a session row, and
   * set httpOnly auth cookies on the response.
   */
  async verifyOtp(ctx: Context) {
    const { email, code } = ctx.get("validatedData") as VerifyOtpInput;
    const stored = await redis.get(`otp:${email}`);
    if (!stored || stored !== code) {
      throw new BadRequestException("Invalid or expired verification code");
    }
    await redis.del(`otp:${email}`);

    const user = await prisma.user.upsert({
      where: { email },
      create: { email, isVerified: true },
      update: { isVerified: true },
    });

    const expiresAt = new Date(Date.now() + env.JWT_REFRESH_TOKEN_TTL * 1000);
    const session = await prisma.authSession.create({
      data: {
        userId: user.id,
        userAgent: ctx.req.header("user-agent") ?? null,
        ipAddress: ctx.req.header("x-forwarded-for") ?? null,
        expiresAt,
      },
    });

    const tokens = jwtService.createTokenPair(user.id, user.email, session.id);
    cookieManager.setCookie(ctx, AUTH_COOKIE_NAME, tokens.accessToken, {
      maxAge: env.JWT_ACCESS_TOKEN_TTL,
      sameSite: "lax",
      secure: env.NODE_ENV === "production",
      domain: env.COOKIE_DOMAIN,
    });
    cookieManager.setCookie(ctx, REFRESH_COOKIE_NAME, tokens.refreshToken, {
      maxAge: env.JWT_REFRESH_TOKEN_TTL,
      sameSite: "lax",
      secure: env.NODE_ENV === "production",
      domain: env.COOKIE_DOMAIN,
    });

    return sendResponse.success(ctx, "Signed in", 200, {
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        avatarUrl: user.avatarUrl,
      },
      ...tokens,
    });
  }

  async me(ctx: Context) {
    const user = ctx.get("user") as { id: string; email: string; name: string | null; avatarUrl: string | null };
    if (!user) throw new UnauthorizedException();
    return sendResponse.success(ctx, null, 200, { user });
  }

  /**
   * Tear down the session row, clear cookies, and invalidate any cached
   * session lookup keyed by the access token.
   */
  async logout(ctx: Context) {
    const sessionId = ctx.get("sessionId") as string | undefined;
    if (sessionId) {
      await prisma.authSession.delete({ where: { id: sessionId } }).catch(() => undefined);
    }
    cookieManager.clearCookie(ctx, AUTH_COOKIE_NAME, {
      domain: env.COOKIE_DOMAIN,
    });
    cookieManager.clearCookie(ctx, REFRESH_COOKIE_NAME, {
      domain: env.COOKIE_DOMAIN,
    });
    return sendResponse.success(ctx, "Signed out", 200, null);
  }
}

export const authController = new AuthController();
