import env from "./env.js";

/**
 * Feature ids that can have AI model overrides set in Redis.
 * Matches the ModelKit pattern from scribe/brandowl/toneprint:
 * a Hono router exposes /api/modelkit for admins to swap model + temperature
 * + maxTokens per feature without redeploying.
 *
 * The current import is left as `unknown` to keep the starter free of an
 * external `@benrobo/modelkit` dependency. Wire it up in three steps:
 *
 *   1. Install: `bun add @benrobo/modelkit`
 *   2. Replace `modelKit` and `modelKitRouter` below with the real instances:
 *
 *        ```ts
 *        import { createModelKit, createRedisAdapter } from "@benrobo/modelkit";
 *        import { createModelKitHonoRouter } from "@benrobo/modelkit/hono";
 *
 *        const adapter = createRedisAdapter<FeatureId>({ url: env.REDIS_URL });
 *        export const modelKit = createModelKit<FeatureId>(adapter, {
 *          cacheTTL: 60_000,
 *        });
 *        export const modelKitRouter = createModelKitHonoRouter(modelKit);
 *        ```
 *
 *   3. Mount the router in `app.ts` (already wired, see initializeRoutes).
 */
export type FeatureId =
  | "ai.text.default"
  | "ai.text.summarize"
  | "ai.vision.analyze";

export const FEATURE_IDS: FeatureId[] = [
  "ai.text.default",
  "ai.text.summarize",
  "ai.vision.analyze",
];

export const modelKit = {
  enabled: Boolean(env.OPENROUTER_API_KEY),
};

export const modelKitRouter = null as never;
