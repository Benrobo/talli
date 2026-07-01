# Pattern recipes

The engine codifies a small set of reusable patterns. Use them. Don't
reinvent them when you add a new route.

## 1. Hono route

```ts
import { Hono } from "hono";
import useCatchErrors from "../lib/use-catch-errors.js";
import { validateSchema } from "../middleware/validate.js";
import { isAuthenticated } from "../middleware/auth.js";
import { rateLimiter } from "../lib/rate-limiter.js";
import { requireFeature } from "../middleware/feature-gate.js";

const router = new Hono();

router.post(
  "/widgets",
  requireFeature("widgets"),
  rateLimiter.rateLimit({ windowMs: 60_000, max: 10, keyPrefix: "widgets" }),
  validateSchema(createWidgetSchema),
  useCatchErrors(isAuthenticated(controller.create.bind(controller)))
);
```

Order matters: feature-gate first (cheapest reject), then rate limit, then
validation, then `useCatchErrors(isAuthenticated(handler))`.

## 2. Standard response envelope

```ts
return sendResponse.success(c, "Created", 201, { widget });
return sendResponse.error(c, "Not allowed", 403);
```

The frontend types this as `{ message?: string; data: T }` (success) or
`{ message: string; data?: unknown }` (error). See `@app/shared`.

## 3. Throwing typed errors

```ts
import { NotFoundException, ForbiddenException } from "../lib/exception.js";

if (!widget) throw new NotFoundException("Widget not found");
if (widget.userId !== ctx.get("userId")) throw new ForbiddenException();
```

`use-catch-errors.ts` translates these to JSON automatically.

## 4. Auth in a controller

```ts
async update(ctx: Context) {
  const user = ctx.get("user") as AuthedUser;
  const id = ctx.req.param("id");
  const input = ctx.get("validatedData") as UpdateWidgetInput;
  ...
}
```

The user is set on the context by `isAuthenticated`. Never look up the user
again inside the controller.

## 5. AI generation with fallback

```ts
import { generate, MODELS } from "../services/ai/index.js";

const text = await generate(prompt, {
  model: MODELS.openai.gpt4oMini,
  temperature: 0.4,
  maxTokens: 4096,
});
```

`generate()` retries the primary twice and then falls back through
`FALLBACK_MODELS`. Use `cleanLLMJson({...})` before `JSON.parse`.

## 6. Layered cache reads

```ts
import cacheAdapter from "../lib/cache-adapter.js";

const key = `feed:${userId}`;
const cached = await cacheAdapter.get(key);
if (cached) return JSON.parse(cached);

const fresh = await loadFromDb();
await cacheAdapter.set(key, JSON.stringify(fresh), 300);
return fresh;
```

Reads check NodeCache before Redis; writes mirror to both. Pass `skipRedis`
in the auth-cache hot path so you don't blow ephemeral Redis on every request.

## 7. Distributed rate limiting

```ts
const rl = new RateLimiter();
router.post(
  "/auth/otp",
  rl.rateLimit({
    windowMs: 60_000,
    max: 3,
    keyPrefix: "otp",
    bodyField: "email",
  }),
  ...
);
```

When `bodyField` is set the limiter throttles per-value (per-email) instead
of per-IP. Useful for auth endpoints behind shared egress IPs.

## 8. Notification scheduling

```ts
import { enqueueNotification } from "../lib/notification-queue.js";

await enqueueNotification({
  type: "milestone_hit",
  actorId: actor.id,
  recipientId: recipient.id,
  title: "You hit a milestone",
  body: "Nice work.",
}, async (immediate) => {
  await notificationService.create(immediate);
});
```

Immediate types fire right away (deduped 60s); deferred types queue with a
delay and optional batch window. `cron/process-notifications.ts` drains.

## 9. WebSocket emit

```ts
import { emitToUser } from "../socket/server.js";
emitToUser(userId, "widget:updated", { widget });
```

Joining `user:${userId}` happens in `socket/server.ts`; you only call
`emitToUser`. Pair with `queryClient.invalidateQueries(["widget"])` on the
client to keep React Query cache coherent.

## 10. Trigger.dev task

```ts
import { task } from "@trigger.dev/sdk";

export const renderImage = task({
  id: "render.image",
  maxDuration: 300,
  run: async (payload: { imageId: string }) => { ... },
});

await renderImage.trigger({ imageId });
```

Tasks live under `services/engine/src/trigger/`. The Bun runtime is set in
`trigger.config.ts`.
