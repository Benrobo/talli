import type { Context, Next } from "hono";
import { isFeatureEnabled, type FeatureFlag } from "../config/feature-flags.js";
import sendResponse from "../lib/send-response.js";

/**
 * Block a route until every supplied feature flag is enabled.
 *
 * ```ts
 * router.post(
 *   "/widgets",
 *   requireFeature("widgets"),
 *   validateSchema(createWidgetSchema),
 *   useCatchErrors(isAuthenticated(controller.create))
 * );
 * ```
 */
export function requireFeature(...flags: FeatureFlag[]) {
  return async (c: Context, next: Next) => {
    for (const flag of flags) {
      if (!isFeatureEnabled(flag)) {
        return sendResponse.error(c, "This feature is not currently available", 403);
      }
    }
    await next();
  };
}
