import { Hono } from "hono";
import { workspaceController } from "../controllers/workspace.controller.js";
import { createWorkspaceSchema } from "../schemas/workspace.schema.js";
import useCatchErrors from "../lib/use-catch-errors.js";
import { validateSchema } from "../middleware/validate.js";
import { isAuthenticated } from "../middleware/auth.js";
import { rateLimiter } from "../lib/rate-limiter.js";
import { requireFeature } from "../middleware/feature-gate.js";

const router = new Hono();

router.get(
  "/workspaces",
  requireFeature("workspaces"),
  useCatchErrors(isAuthenticated(workspaceController.list.bind(workspaceController)))
);

router.post(
  "/workspaces",
  requireFeature("workspaces"),
  rateLimiter.rateLimit({ windowMs: 60_000, max: 10, keyPrefix: "workspaces:create" }),
  validateSchema(createWorkspaceSchema),
  useCatchErrors(isAuthenticated(workspaceController.create.bind(workspaceController)))
);

router.post(
  "/workspaces/:workspaceId/switch",
  requireFeature("workspaces"),
  rateLimiter.rateLimit({ windowMs: 60_000, max: 30, keyPrefix: "workspaces:switch" }),
  useCatchErrors(isAuthenticated(workspaceController.switch.bind(workspaceController)))
);

export default router;
