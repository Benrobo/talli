import { Hono } from "hono";
import sendResponse from "../lib/send-response.js";

const router = new Hono();

router.get("/health", (c) => sendResponse.success(c, null, 200, { status: "ok" }));

export default router;
