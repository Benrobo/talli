import redis from "./redis.js";
import logger from "./logger.js";

export type NotificationMode = "immediate" | "deferred";

export interface NotificationType {
  mode: NotificationMode;
  delayMs: number;
  batchWindowMs: number;
}

/**
 * Notification dispatch policy. Add new types here.
 *
 * - **immediate** — fired right away, deduped for 60s by `(type, actor, recipient)`.
 * - **deferred** — held in a Redis ZSET until `delayMs` elapses, optionally
 *   batched within `batchWindowMs` so multiple events collapse into one push.
 *
 * A cron job (`cron/process-notifications.ts`) drains the ZSET each tick.
 */
export const NOTIFICATION_TYPES: Record<string, NotificationType> = {
  system: { mode: "immediate", delayMs: 0, batchWindowMs: 0 },
  account_alert: { mode: "immediate", delayMs: 0, batchWindowMs: 0 },
  new_follower: { mode: "deferred", delayMs: 45_000, batchWindowMs: 120_000 },
  milestone_hit: { mode: "deferred", delayMs: 10_000, batchWindowMs: 60_000 },
};

export interface EnqueueParams {
  type: string;
  actorId: string;
  recipientId: string;
  title: string;
  body: string;
  data?: Record<string, unknown>;
}

/**
 * Schedule a notification for delivery. Immediate types are deduped for 60s;
 * deferred types respect their delay + batch window.
 */
export async function enqueueNotification(
  params: EnqueueParams,
  onImmediate: (p: EnqueueParams) => Promise<void>
) {
  const config = NOTIFICATION_TYPES[params.type];
  if (!config) {
    logger.warn(`[notif-queue] unknown type: ${params.type}`);
    return;
  }

  const dedupKey = `${params.type}:${params.actorId}:${params.recipientId}`;

  if (config.mode === "immediate") {
    const isNew = await redis.set(`notif:sent:${dedupKey}`, "1", "EX", 60, "NX");
    if (!isNew) return;
    await onImmediate(params);
    return;
  }

  const dispatchAt = Date.now() + config.delayMs;
  const payload: Record<string, string> = {
    type: params.type,
    actorId: params.actorId,
    recipientId: params.recipientId,
    title: params.title,
    body: params.body,
  };
  if (params.data) payload.data = JSON.stringify(params.data);

  await redis.zadd("notif:pending", String(dispatchAt), dedupKey);
  await redis.hset(`notif:data:${dedupKey}`, payload);
  await redis.expire(`notif:data:${dedupKey}`, 3600);

  if (config.batchWindowMs > 0) {
    const batchKey = `${params.type}:${params.recipientId}`;
    await redis.sadd(`notif:batch:${batchKey}`, dedupKey);
    await redis.expire(
      `notif:batch:${batchKey}`,
      Math.ceil(config.batchWindowMs / 1000) + 60
    );
  }
}

/**
 * Cancel a pending deferred notification. No-op for immediate types.
 */
export async function cancelNotification(
  type: string,
  actorId: string,
  recipientId: string
) {
  const config = NOTIFICATION_TYPES[type];
  if (!config || config.mode === "immediate") return;

  const dedupKey = `${type}:${actorId}:${recipientId}`;
  await redis.zrem("notif:pending", dedupKey);
  await redis.del(`notif:data:${dedupKey}`);
  if (config.batchWindowMs > 0) {
    await redis.srem(`notif:batch:${type}:${recipientId}`, dedupKey);
  }
}
