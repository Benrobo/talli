import { Hono } from "hono";
import { walletController } from "../controllers/wallet.controller.js";
import { topUpSchema } from "../schemas/wallet.schema.js";
import useCatchErrors from "../lib/use-catch-errors.js";
import { validateSchema } from "../middleware/validate.js";
import { isAuthenticated } from "../middleware/auth.js";

const router = new Hono();
const c = walletController;

router.get("/wallet", useCatchErrors(isAuthenticated(c.balance.bind(c))));

router.get("/wallet/history", useCatchErrors(isAuthenticated(c.history.bind(c))));

router.post(
  "/wallet/topup",
  validateSchema(topUpSchema),
  useCatchErrors(isAuthenticated(c.topUp.bind(c)))
);

export default router;
