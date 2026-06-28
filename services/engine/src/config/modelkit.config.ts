import { createModelKit, createRedisAdapter } from "@benrobo/modelkit";
import { createModelKitHonoRouter } from "@benrobo/modelkit/hono";
import env from "./env.js";
import type { FeatureId } from "../modelkit.generated.js";

const adapter = createRedisAdapter<FeatureId>({
  url: env.REDIS_URL,
  prefix: "talli:modelkit:overrides:",
});

export const modelKit = createModelKit<FeatureId>(adapter, {
  cacheTTL: 60_000,
});

export const modelKitRouter = createModelKitHonoRouter(modelKit);
