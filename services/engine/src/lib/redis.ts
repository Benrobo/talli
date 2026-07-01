import Redis from "ioredis";
import env from "../config/env.js";

const redis = new Redis(env.REDIS_URL, {
  maxRetriesPerRequest: 3,
  retryStrategy(times) {
    return Math.min(times * 200, 2000);
  },
});

redis.on("error", (err) => {
  console.error("[redis] connection error:", err.message);
});

export default redis;
