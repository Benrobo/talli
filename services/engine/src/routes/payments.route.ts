import { Hono } from "hono";
import { paymentsController } from "../controllers/payments.controller.js";
import useCatchErrors from "../lib/use-catch-errors.js";
import { isAuthenticated } from "../middleware/auth.js";

const router = new Hono();
const c = paymentsController;

router.get("/payments", useCatchErrors(isAuthenticated(c.list.bind(c))));

export default router;
