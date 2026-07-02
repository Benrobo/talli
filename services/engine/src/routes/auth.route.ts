import { Hono } from "hono";
import { authController } from "../controllers/auth.controller.js";
import {
  requestOtpSchema,
  verifyOtpSchema,
  refreshSchema,
  updateProfileSchema,
} from "../schemas/auth.schema.js";
import useCatchErrors from "../lib/use-catch-errors.js";
import { validateSchema } from "../middleware/validate.js";
import { isAuthenticated } from "../middleware/auth.js";
import { rateLimiter } from "../lib/rate-limiter.js";

const router = new Hono();

router.post(
  "/auth/request-otp",
  rateLimiter.rateLimit({
    windowMs: 60_000,
    max: 3,
    keyPrefix: "otp",
    bodyField: "email",
  }),
  validateSchema(requestOtpSchema),
  useCatchErrors(authController.requestOtp.bind(authController))
);

router.post(
  "/auth/verify-otp",
  rateLimiter.rateLimit({
    windowMs: 60_000,
    max: 5,
    keyPrefix: "otp:verify",
    bodyField: "email",
  }),
  validateSchema(verifyOtpSchema),
  useCatchErrors(authController.verifyOtp.bind(authController))
);

router.post(
  "/auth/refresh",
  validateSchema(refreshSchema),
  useCatchErrors(authController.refresh.bind(authController))
);

router.get(
  "/auth/me",
  useCatchErrors(isAuthenticated(authController.me.bind(authController)))
);

router.patch(
  "/auth/me",
  rateLimiter.rateLimit({ windowMs: 60_000, max: 10, keyPrefix: "auth:profile" }),
  validateSchema(updateProfileSchema),
  useCatchErrors(isAuthenticated(authController.updateMe.bind(authController)))
);

router.post(
  "/auth/logout",
  useCatchErrors(isAuthenticated(authController.logout.bind(authController)))
);

export default router;
