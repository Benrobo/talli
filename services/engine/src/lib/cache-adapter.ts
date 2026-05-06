import NodeCache from "node-cache";
import redis from "./redis.js";
import logger from "./logger.js";

/**
 * Two-layer cache: in-process `node-cache` first, then Redis.
 * Reads check memory before the network. Writes mirror to both
 * (unless `skipRedis` is true). Tail latency stays low under load
 * and a Redis blip does not break read paths immediately.
 */
export interface CacheAdapter {
  get(key: string, skipRedis?: boolean): Promise<string | null>;
  set(key: string, value: string, ttlSeconds: number, skipRedis?: boolean): Promise<void>;
  del(key: string, skipRedis?: boolean): Promise<void>;
  clear(pattern?: string): Promise<void>;
  incr(key: string, amount: number, ttlSeconds: number): Promise<number>;
  decr(key: string): Promise<number>;
  ttl(key: string): Promise<number>;
}

class CacheAdapterImpl implements CacheAdapter {
  private memoryCache: NodeCache;

  constructor() {
    this.memoryCache = new NodeCache({
      stdTTL: 3600,
      checkperiod: 600,
      maxKeys: 10_000,
      useClones: false,
    });
  }

  async get(key: string, skipRedis?: boolean): Promise<string | null> {
    try {
      const local = this.memoryCache.get<string>(key);
      if (local !== undefined) return local;
    } catch (err) {
      logger.error("[cache] memory get failed:", err);
    }

    if (skipRedis) return null;

    try {
      const remote = await redis.get(key);
      if (remote) {
        try {
          this.memoryCache.set(key, remote);
        } catch {}
        return remote;
      }
    } catch (err) {
      logger.error("[cache] redis get failed:", err);
    }
    return null;
  }

  async set(key: string, value: string, ttlSeconds: number, skipRedis?: boolean) {
    try {
      this.memoryCache.set(key, value, ttlSeconds);
    } catch (err) {
      logger.error("[cache] memory set failed:", err);
    }
    if (skipRedis) return;
    try {
      await redis.setex(key, ttlSeconds, value);
    } catch (err) {
      logger.error("[cache] redis set failed:", err);
    }
  }

  async del(key: string, skipRedis?: boolean) {
    try {
      this.memoryCache.del(key);
    } catch (err) {
      logger.error("[cache] memory del failed:", err);
    }
    if (skipRedis) return;
    try {
      await redis.del(key);
    } catch (err) {
      logger.error("[cache] redis del failed:", err);
    }
  }

  async incr(key: string, amount: number, ttlSeconds: number): Promise<number> {
    try {
      const next = await redis.incrby(key, amount);
      const currentTtl = await redis.ttl(key);
      if (currentTtl < 0) {
        await redis.expire(key, ttlSeconds);
      }
      const syncTtl = currentTtl > 0 ? currentTtl : ttlSeconds;
      this.memoryCache.set(key, String(next), syncTtl);
      return next;
    } catch (err) {
      logger.error("[cache] redis incr failed:", err);
      return 0;
    }
  }

  async decr(key: string): Promise<number> {
    try {
      const current = await redis.get(key);
      if (!current || parseInt(current, 10) <= 0) return 0;
      const next = await redis.decr(key);
      const safe = Math.max(0, next);
      const currentTtl = await redis.ttl(key);
      if (currentTtl > 0) {
        this.memoryCache.set(key, String(safe), currentTtl);
      }
      return safe;
    } catch (err) {
      logger.error("[cache] redis decr failed:", err);
      return 0;
    }
  }

  async ttl(key: string): Promise<number> {
    try {
      return await redis.ttl(key);
    } catch (err) {
      logger.error("[cache] redis ttl failed:", err);
      return -2;
    }
  }

  async clear(pattern?: string): Promise<void> {
    if (pattern) {
      try {
        const keys = await redis.keys(pattern);
        if (keys.length > 0) {
          for (const k of keys) {
            try {
              this.memoryCache.del(k);
            } catch {}
          }
          await redis.del(...keys);
        }
      } catch (err) {
        logger.error("[cache] redis clear failed:", err);
      }
      return;
    }
    try {
      this.memoryCache.flushAll();
    } catch (err) {
      logger.error("[cache] memory flush failed:", err);
    }
  }
}

export const cacheAdapter = new CacheAdapterImpl();
export default cacheAdapter;
