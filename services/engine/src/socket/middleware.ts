import type { Socket } from "socket.io";
import jwtService from "../lib/jwt.js";
import prisma from "../prisma/index.js";
import logger from "../lib/logger.js";

/**
 * Socket.IO auth gate. Reads `auth.token` from the handshake, verifies the
 * JWT, confirms the session row in Postgres, and attaches `userId` and
 * `sessionId` onto `socket.data`.
 */
export function authMiddleware(socket: Socket, next: (err?: Error) => void) {
  try {
    const token = socket.handshake.auth?.token as string | undefined;
    if (!token) return next(new Error("Authentication required"));

    let payload;
    try {
      payload = jwtService.verifyAccessToken(token);
    } catch {
      return next(new Error("Invalid token"));
    }

    prisma.authSession
      .findFirst({
        where: {
          id: payload.sessionId,
          userId: payload.userId,
          expiresAt: { gt: new Date() },
        },
      })
      .then((session) => {
        if (!session) return next(new Error("Session expired"));
        socket.data.userId = payload.userId;
        socket.data.sessionId = payload.sessionId;
        next();
      })
      .catch(() => next(new Error("Authentication failed")));
  } catch (err) {
    logger.error("[socket-auth]", err);
    next(new Error("Authentication failed"));
  }
}
