import { Hono } from "hono";
import { chatLinkController } from "../controllers/chat-link.controller.js";
import { createLinkCodeSchema } from "../schemas/chat-link.schema.js";
import useCatchErrors from "../lib/use-catch-errors.js";
import { validateSchema } from "../middleware/validate.js";
import { isAuthenticated } from "../middleware/auth.js";
import { rateLimiter } from "../lib/rate-limiter.js";

const router = new Hono();

router.post(
  "/chat/link-codes",
  rateLimiter.rateLimit({
    windowMs: 60_000,
    max: 10,
    keyPrefix: "chat:link-code",
  }),
  validateSchema(createLinkCodeSchema),
  useCatchErrors(isAuthenticated(chatLinkController.createCode.bind(chatLinkController)))
);

export default router;
