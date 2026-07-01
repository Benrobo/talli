import { Hono } from "hono";
import { transferController } from "../controllers/transfer.controller.js";
import { lookupAccountSchema, sendMoneySchema } from "../schemas/transfer.schema.js";
import useCatchErrors from "../lib/use-catch-errors.js";
import { validateSchema } from "../middleware/validate.js";
import { isAuthenticated } from "../middleware/auth.js";

const router = new Hono();
const c = transferController;

router.get("/transfers/banks", useCatchErrors(isAuthenticated(c.banks.bind(c))));

router.get("/transfers", useCatchErrors(isAuthenticated(c.history.bind(c))));

router.post(
  "/transfers/lookup",
  validateSchema(lookupAccountSchema),
  useCatchErrors(isAuthenticated(c.lookup.bind(c)))
);

router.post(
  "/transfers",
  validateSchema(sendMoneySchema),
  useCatchErrors(isAuthenticated(c.send.bind(c)))
);

export default router;
