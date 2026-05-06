import { Server } from "socket.io";
import { createServer } from "http";
import { CORS_ORIGINS } from "../config/internal-config.js";
import logger from "../lib/logger.js";
import { authMiddleware } from "./middleware.js";

let io: Server | null = null;

/**
 * Spin up a Socket.IO server on its own HTTP listener. Sharing a port with
 * the Hono app is possible but a separate port keeps the WebSocket lifecycle
 * isolated from request/response code.
 */
export function startSocketServer(port: number): Server {
  const httpServer = createServer();
  io = new Server(httpServer, {
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
      logger.info(`[socket] connected user=${userId} sid=${socket.id}`);
    }

    socket.on("disconnect", (reason) => {
      logger.info(`[socket] disconnected sid=${socket.id} reason=${reason}`);
    });
  });

  httpServer.listen(port, () => {
    logger.info(`[socket] listening on http://localhost:${port}`);
  });

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
