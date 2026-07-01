import { Hono } from "hono";
import { personPickerController } from "../controllers/person-picker.controller.js";
import { pickerCheckoutSchema } from "../schemas/person-picker.schema.js";
import useCatchErrors from "../lib/use-catch-errors.js";
import { validateSchema } from "../middleware/validate.js";
import { isAuthenticated } from "../middleware/auth.js";
import { rateLimiter } from "../lib/rate-limiter.js";

const router = new Hono();
const c = personPickerController;

router.get(
  "/person-pickers/by-token/:token",
  useCatchErrors(c.getByToken.bind(c))
);

router.post(
  "/person-pickers/by-token/:token/checkout",
  rateLimiter.rateLimit({
    windowMs: 60_000,
    max: 10,
    keyPrefix: "picker:checkout",
    bodyField: "payerName",
  }),
  validateSchema(pickerCheckoutSchema),
  useCatchErrors(c.checkout.bind(c))
);

router.get(
  "/person-pickers",
  useCatchErrors(isAuthenticated(c.list.bind(c)))
);

router.get(
  "/person-pickers/:id/progress",
  useCatchErrors(isAuthenticated(c.progress.bind(c)))
);

export default router;
