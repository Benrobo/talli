import { Hono } from "hono";
import { collectionController } from "../controllers/collection.controller.js";
import {
  createCollectionSchema,
  addMemberSchema,
  updateCollectionStatusSchema,
  updateCollectionSchema,
  collectionPayCheckoutSchema,
} from "../schemas/collection.schema.js";
import useCatchErrors from "../lib/use-catch-errors.js";
import { validateSchema } from "../middleware/validate.js";
import { isAuthenticated } from "../middleware/auth.js";
import { rateLimiter } from "../lib/rate-limiter.js";

const router = new Hono();
const c = collectionController;

router.get("/collections/pay/:reference", useCatchErrors(c.getPayView.bind(c)));

router.post(
  "/collections/pay/:reference/checkout",
  rateLimiter.rateLimit({
    windowMs: 60_000,
    max: 10,
    keyPrefix: "collection:checkout",
    bodyField: "payerName",
  }),
  validateSchema(collectionPayCheckoutSchema),
  useCatchErrors(c.checkoutPay.bind(c))
);

router.post(
  "/collections/pay/:reference/cancel",
  rateLimiter.rateLimit({ windowMs: 60_000, max: 20, keyPrefix: "collection:cancel" }),
  useCatchErrors(c.cancelPay.bind(c))
);

router.post(
  "/collections/pay/:reference/verify",
  rateLimiter.rateLimit({ windowMs: 60_000, max: 30, keyPrefix: "collection:verify" }),
  useCatchErrors(c.verifyPay.bind(c))
);

router.post(
  "/collections",
  validateSchema(createCollectionSchema),
  useCatchErrors(isAuthenticated(c.create.bind(c)))
);

router.get("/collections", useCatchErrors(isAuthenticated(c.list.bind(c))));

router.get("/collections/:id", useCatchErrors(isAuthenticated(c.get.bind(c))));

router.get("/collections/:id/members", useCatchErrors(isAuthenticated(c.listMembers.bind(c))));

router.get("/collections/:id/payments", useCatchErrors(isAuthenticated(c.listPayments.bind(c))));

router.post(
  "/collections/:id/members",
  validateSchema(addMemberSchema),
  useCatchErrors(isAuthenticated(c.addMember.bind(c)))
);

router.patch(
  "/collections/:id",
  validateSchema(updateCollectionStatusSchema),
  useCatchErrors(isAuthenticated(c.updateStatus.bind(c)))
);

router.put(
  "/collections/:id",
  validateSchema(updateCollectionSchema),
  useCatchErrors(isAuthenticated(c.update.bind(c)))
);

router.delete("/collections/:id", useCatchErrors(isAuthenticated(c.remove.bind(c))));

export default router;
