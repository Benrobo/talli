import { Hono } from "hono";
import { billSplitController } from "../controllers/bill-split.controller.js";
import { billSplitCheckoutSchema } from "../schemas/bill-split.schema.js";
import useCatchErrors from "../lib/use-catch-errors.js";
import { validateSchema } from "../middleware/validate.js";
import { isAuthenticated } from "../middleware/auth.js";
import { rateLimiter } from "../lib/rate-limiter.js";

const router = new Hono();
const c = billSplitController;

router.get("/bill-splits/by-token/:token", useCatchErrors(c.getByToken.bind(c)));

router.post(
  "/bill-splits/by-token/:token/checkout",
  rateLimiter.rateLimit({
    windowMs: 60_000,
    max: 10,
    keyPrefix: "billsplit:checkout",
    bodyField: "payerName",
  }),
  validateSchema(billSplitCheckoutSchema),
  useCatchErrors(c.checkout.bind(c))
);

router.post(
  "/bill-splits",
  rateLimiter.rateLimit({ windowMs: 60_000, max: 10, keyPrefix: "billsplit:create" }),
  useCatchErrors(isAuthenticated(c.createFromImage.bind(c)))
);

router.get("/bill-splits", useCatchErrors(isAuthenticated(c.list.bind(c))));

router.get("/bill-splits/:id/progress", useCatchErrors(isAuthenticated(c.progress.bind(c))));

export default router;
