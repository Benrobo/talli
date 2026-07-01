import { Hono } from "hono";
import { telegramWebhook } from "../integrations/telegram/index.js";
import { webhookController } from "../controllers/webhook.controller.js";
import useCatchErrors from "../lib/use-catch-errors.js";
import env from "../config/env.js";

const router = new Hono();
const basePath = "/webhook";

const publicUrl = (provider: string) => `${env.PUBLIC_API_URL}/api${basePath}/${provider}`;

router.get(basePath, (c) => {
  return c.json({ code: 200, message: "Talli Webhook", data: {
    telegram: publicUrl("telegram"),
    nomba: publicUrl("nomba"),
  }, status: 200 });
});

router.post(`${basePath}/telegram`, telegramWebhook);

router.post(`${basePath}/nomba`, useCatchErrors(webhookController.nomba.bind(webhookController)));

export default router;
