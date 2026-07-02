import { Hono } from "hono";
import { savingsController } from "../controllers/savings.controller.js";
import {
  createSavingsJarSchema,
  depositToSavingsJarSchema,
  updateSavingsJarSchema,
} from "../schemas/savings.schema.js";
import useCatchErrors from "../lib/use-catch-errors.js";
import { validateSchema } from "../middleware/validate.js";
import { isAuthenticated } from "../middleware/auth.js";
import { requireFeature } from "../middleware/feature-gate.js";
import { rateLimiter } from "../lib/rate-limiter.js";

const router = new Hono();
const c = savingsController;

router.get(
  "/savings",
  requireFeature("savings"),
  useCatchErrors(isAuthenticated(c.list.bind(c)))
);

router.get(
  "/savings/:id",
  requireFeature("savings"),
  useCatchErrors(isAuthenticated(c.get.bind(c)))
);

router.post(
  "/savings",
  requireFeature("savings"),
  rateLimiter.rateLimit({ windowMs: 60_000, max: 20, keyPrefix: "savings:create" }),
  validateSchema(createSavingsJarSchema),
  useCatchErrors(isAuthenticated(c.create.bind(c)))
);

router.put(
  "/savings/:id",
  requireFeature("savings"),
  rateLimiter.rateLimit({ windowMs: 60_000, max: 20, keyPrefix: "savings:update" }),
  validateSchema(updateSavingsJarSchema),
  useCatchErrors(isAuthenticated(c.update.bind(c)))
);

router.delete(
  "/savings/:id",
  requireFeature("savings"),
  rateLimiter.rateLimit({ windowMs: 60_000, max: 20, keyPrefix: "savings:delete" }),
  useCatchErrors(isAuthenticated(c.remove.bind(c)))
);

router.post(
  "/savings/:id/deposits",
  requireFeature("savings"),
  rateLimiter.rateLimit({ windowMs: 60_000, max: 30, keyPrefix: "savings:deposit" }),
  validateSchema(depositToSavingsJarSchema),
  useCatchErrors(isAuthenticated(c.deposit.bind(c)))
);

router.post(
  "/savings/:id/deposits/verify",
  requireFeature("savings"),
  rateLimiter.rateLimit({ windowMs: 60_000, max: 60, keyPrefix: "savings:deposit-verify" }),
  useCatchErrors(isAuthenticated(c.verifyDeposit.bind(c)))
);

router.post(
  "/savings/:id/deposits/cancel",
  requireFeature("savings"),
  rateLimiter.rateLimit({ windowMs: 60_000, max: 30, keyPrefix: "savings:deposit-cancel" }),
  useCatchErrors(isAuthenticated(c.cancelDeposit.bind(c)))
);

export default router;
