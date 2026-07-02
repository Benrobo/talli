import { Hono } from "hono";
import { transactionsController } from "../controllers/transactions.controller.js";
import useCatchErrors from "../lib/use-catch-errors.js";
import { isAuthenticated } from "../middleware/auth.js";

const router = new Hono();
const c = transactionsController;

router.get("/transactions", useCatchErrors(isAuthenticated(c.list.bind(c))));

export default router;
