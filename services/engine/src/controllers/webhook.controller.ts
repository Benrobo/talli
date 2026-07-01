import type { Context } from "hono";
import { nombaWebhookService } from "../services/webhook/nomba.wh.service.js";

class WebhookController {
  /** Nomba webhook. Reads the raw body for signature verification, then 200s. */
  async nomba(ctx: Context) {
    const rawBody = await ctx.req.text();
    const headers = Object.fromEntries(ctx.req.raw.headers.entries());
    const { accepted } = await nombaWebhookService.handle(rawBody, headers);
    return ctx.json({ accepted }, 200);
  }
}

export const webhookController = new WebhookController();
