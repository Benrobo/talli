import { Hono } from "hono";
import { receiptController } from "../controllers/receipt.controller.js";
import useCatchErrors from "../lib/use-catch-errors.js";
import { isAuthenticated } from "../middleware/auth.js";

const router = new Hono();
const c = receiptController;

router.get("/receipts/:reference", useCatchErrors(isAuthenticated(c.download.bind(c))));

export default router;
