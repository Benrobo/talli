import { Server } from "socket.io";
import type { Server as HttpServer } from "http";
import type { ServerType } from "@hono/node-server";
import { CORS_ORIGINS } from "../config/internal-config.js";
import logger from "../lib/logger.js";
import { authMiddleware } from "./middleware.js";

let io: Server | null = null;

/**
 * Attach Socket.IO to the existing Hono HTTP server so both share one port.
 * Socket.IO claims the `/socket.io` path; every other request falls through
 * to Hono untouched.
 */
export function startSocketServer(httpServer: ServerType): Server {
  io = new Server(httpServer as HttpServer, {
    cors: {
      origin: CORS_ORIGINS,
      credentials: true,
    },
    path: "/socket.io",
  });

  io.use(authMiddleware);

  io.on("connection", (socket) => {
    const userId = socket.data.userId as string | undefined;
    if (userId) {
      socket.join(`user:${userId}`);
      logger.info(`[socket] ✅ connected user=${userId} sid=${socket.id}`);
    } else {
      logger.info(`[socket] connected anonymous sid=${socket.id}`);
    }

    socket.on("join-bill", (token: unknown) => {
      if (typeof token !== "string" || !token) return;
      socket.join(`bill:${token}`);
    });

    socket.on("disconnect", (reason) => {
      logger.info(`[socket] disconnected sid=${socket.id} reason=${reason}`);
    });
  });

  io.engine.on("connection_error", (err) => {
    logger.warn(`[socket] connection rejected: ${err.code} ${err.message}`);
  });

  logger.info("[socket] attached to engine server at /socket.io");
  return io;
}

/**
 * Get the running socket server. Throws if accessed before `startSocketServer`.
 */
export function getIo(): Server {
  if (!io) throw new Error("Socket server not initialized");
  return io;
}

/**
 * Push an event to a single user's room.
 */
export function emitToUser(userId: string, event: string, payload: unknown) {
  if (!io) return;
  io.to(`user:${userId}`).emit(event, payload);
}

export function emitToBill(token: string, event: string, payload: unknown) {
  if (!io) return;
  io.to(`bill:${token}`).emit(event, payload);
}
