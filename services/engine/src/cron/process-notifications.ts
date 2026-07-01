import redis from "../lib/redis.js";
import prisma from "../prisma/index.js";
import logger from "../lib/logger.js";
import { emitToUser } from "../socket/server.js";

/**
 * Drain the deferred notification ZSET and persist any items whose
 * `dispatchAt` has passed. Mirrors the Savi notification pipeline.
 */
export async function processNotifications() {
  const now = Date.now();
  const due = await redis.zrangebyscore("notif:pending", 0, now, "LIMIT", 0, 100);
  if (due.length === 0) return;

  for (const dedupKey of due) {
    const dataKey = `notif:data:${dedupKey}`;
    const payload = await redis.hgetall(dataKey);
    if (!payload || !payload.recipientId) {
      await redis.zrem("notif:pending", dedupKey);
      continue;
    }

    try {
      const notification = await prisma.notification.create({
        data: {
          userId: payload.recipientId,
          type: payload.type ?? "system",
          title: payload.title ?? "",
          body: payload.body ?? "",
          data: payload.data ? JSON.parse(payload.data) : undefined,
        },
      });

      emitToUser(payload.recipientId, "notification:new", notification);
    } catch (err) {
      logger.error(`[cron] notification dispatch failed (${dedupKey}):`, err);
    }

    await redis.zrem("notif:pending", dedupKey);
    await redis.del(dataKey);
  }
}
