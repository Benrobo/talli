import jwt from "jsonwebtoken";
import env from "../config/env.js";

export interface AccessTokenPayload {
  userId: string;
  email: string;
  sessionId: string;
}

export interface RefreshTokenPayload {
  userId: string;
  sessionId: string;
  type: "refresh";
}

export interface TokenPair {
  accessToken: string;
  refreshToken: string;
}

/**
 * Issues and verifies stateless JWTs paired with a session row in Postgres
 * (`AuthSession`). Access tokens are short-lived; refresh tokens rotate the
 * session identifier on each refresh.
 */
class JwtService {
  createTokenPair(userId: string, email: string, sessionId: string): TokenPair {
    const accessToken = jwt.sign(
      { userId, email, sessionId } satisfies AccessTokenPayload,
      env.JWT_SECRET,
      { expiresIn: env.JWT_ACCESS_TOKEN_TTL }
    );

    const refreshToken = jwt.sign(
      { userId, sessionId, type: "refresh" } satisfies RefreshTokenPayload,
      env.JWT_SECRET,
      { expiresIn: env.JWT_REFRESH_TOKEN_TTL }
    );

    return { accessToken, refreshToken };
  }

  verifyAccessToken(token: string): AccessTokenPayload {
    return jwt.verify(token, env.JWT_SECRET) as AccessTokenPayload;
  }

  verifyRefreshToken(token: string): RefreshTokenPayload {
    const payload = jwt.verify(token, env.JWT_SECRET) as RefreshTokenPayload;
    if (payload.type !== "refresh") {
      throw new Error("Invalid token type");
    }
    return payload;
  }
}

export const jwtService = new JwtService();
export default jwtService;
