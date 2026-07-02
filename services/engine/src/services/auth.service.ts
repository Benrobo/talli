import env from "../config/env.js";
import prisma from "../prisma/index.js";
import jwtService, { type TokenPair } from "../lib/jwt.js";
import cacheAdapter from "../lib/cache-adapter.js";
import redis from "../lib/redis.js";
import { randomOtp } from "../lib/utils.js";
import { mailService } from "./mail.service.js";
import { virtualAccountService } from "./virtual-account.service.js";
import {
  BadRequestException,
  UnauthorizedException,
} from "../lib/exception.js";

const OTP_TTL_SECONDS = 600;

export interface AuthUser {
  id: string;
  email: string;
  name: string | null;
  avatarUrl: string | null;
}

export interface SessionContext {
  userAgent: string | null;
  ipAddress: string | null;
}

class AuthService {
  async requestOtp(email: string, mode: "signup" | "login"): Promise<void> {
    const code = randomOtp(6);
    await redis.setex(`otp:${email}`, OTP_TTL_SECONDS, code);

    console.log(`Sending OTP to ${email}: ${code}`);

    await mailService.sendOtpEmail(email, code, mode);
  }

  async verifyOtp(
    email: string,
    code: string,
    context: SessionContext,
    name?: string
  ): Promise<{ user: AuthUser; tokens: TokenPair }> {
    const stored = await redis.get(`otp:${email}`);
    if (!stored || stored !== code) {
      throw new BadRequestException("Invalid or expired verification code");
    }
    await redis.del(`otp:${email}`);

    const cleanName = name?.trim() || undefined;
    const user = await prisma.user.upsert({
      where: { email },
      create: { email, isVerified: true, name: cleanName },
      update: { isVerified: true, ...(cleanName ? { name: cleanName } : {}) },
    });

    await virtualAccountService.ensureForUser(user.id);

    const tokens = await this.createSession(user.id, user.email, context);

    return {
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        avatarUrl: user.avatarUrl,
      },
      tokens,
    };
  }

  async refresh(refreshToken: string): Promise<TokenPair> {
    let payload;
    try {
      payload = jwtService.verifyRefreshToken(refreshToken);
    } catch {
      throw new UnauthorizedException("Invalid refresh token");
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

    return jwtService.createTokenPair(user.id, user.email, session.id);
  }

  async logout(accessToken: string): Promise<void> {
    await cacheAdapter.del(`session:${accessToken}`, true);
    let sessionId: string;
    try {
      sessionId = jwtService.verifyAccessToken(accessToken).sessionId;
    } catch {
      return;
    }
    await prisma.authSession
      .delete({ where: { id: sessionId } })
      .catch(() => undefined);
  }

  private async createSession(
    userId: string,
    email: string,
    context: SessionContext
  ): Promise<TokenPair> {
    const expiresAt = new Date(Date.now() + env.JWT_REFRESH_TOKEN_TTL * 1000);
    const session = await prisma.authSession.create({
      data: {
        userId,
        userAgent: context.userAgent,
        ipAddress: context.ipAddress,
        expiresAt,
      },
    });

    return jwtService.createTokenPair(userId, email, session.id);
  }
}

export const authService = new AuthService();
export default authService;
