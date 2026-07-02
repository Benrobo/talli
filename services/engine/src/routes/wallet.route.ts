import { Hono } from "hono";
import { walletController } from "../controllers/wallet.controller.js";
import { topUpSchema, withdrawSchema } from "../schemas/wallet.schema.js";
import { rateLimiter } from "../lib/rate-limiter.js";
import useCatchErrors from "../lib/use-catch-errors.js";
import { validateSchema } from "../middleware/validate.js";
import { isAuthenticated } from "../middleware/auth.js";

const router = new Hono();
const c = walletController;

router.get("/wallet/metrics", useCatchErrors(isAuthenticated(c.metrics.bind(c))));

router.get("/wallet", useCatchErrors(isAuthenticated(c.balance.bind(c))));

router.get("/wallet/history", useCatchErrors(isAuthenticated(c.history.bind(c))));

router.post(
  "/wallet/topup",
  validateSchema(topUpSchema),
  useCatchErrors(isAuthenticated(c.topUp.bind(c)))
);

router.post(
  "/wallet/topup/verify",
  rateLimiter.rateLimit({ windowMs: 60_000, max: 60, keyPrefix: "wallet:topup-verify" }),
  useCatchErrors(isAuthenticated(c.verifyTopUp.bind(c)))
);

router.post(
  "/wallet/withdraw",
  rateLimiter.rateLimit({ windowMs: 60_000, max: 10, keyPrefix: "wallet:withdraw" }),
  validateSchema(withdrawSchema),
  useCatchErrors(isAuthenticated(c.withdraw.bind(c)))
);

export default router;
