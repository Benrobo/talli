# Telegram — library choice and plan

How Talli's Telegram bot will be built: which library, why, and how the code is
laid out so the chat UI (buttons, cards, prompts) is written once and reused.

This is a decision + design doc, not yet implemented. Stack it targets: Bun,
Hono, Prisma, TypeScript ESM (`.js` import extensions) — same engine as the rest
of Talli.

---

## 1. The short answer

Use **[grammY](https://grammy.dev)** (`grammy`, v1.44.0).

It is the only option that fits all four of our constraints at once:

- runs as a **webhook** on a long-running server (not polling),
- drops into **Hono** without glue code,
- runs on **Bun**,
- gives us a button/keyboard builder we can wrap into a **reusable UI layer**.

We still keep grammY behind our own thin wrapper (same as the Nomba SDK), so the
rest of the app never imports `grammy` directly and we could swap it later.

---

## 2. Why grammY and not the others

We looked at three real options. Numbers checked against npm on 2026-06-27.

| | grammY | Telegraf | node-telegram-bot-api |
|---|---|---|---|
| Latest release | 1.44.0 (Jun 2026) | 4.16.3 (**Feb 2024**) | 1.1.2 (Jun 2026) |
| Maintained | actively | stale, ~16 months idle | just rewritten, days old |
| Hono support | **built-in adapter** | needs Node req/res glue | wants to own its own server |
| Verifies webhook secret | **yes, for you** | yes | manual |
| Runs on Bun | yes | works, rough edges | probably, very new |
| Inline keyboard builder | **yes** | yes | yes |
| TypeScript | excellent | good | new rewrite |

Reasoning in plain terms:

- **Telegraf** hasn't shipped in over a year and pulls in `node-fetch`, which is
  pointless on Bun (Bun already has `fetch`). Its webhook helper hands you a
  Node-style `(req, res)`, which doesn't match Hono's request/response objects —
  so we'd be writing adapter glue. Not worth it.
- **node-telegram-bot-api** had a fresh TypeScript rewrite this month with zero
  dependencies, which is nice, but it's only days old (too new to trust for
  money-adjacent code) and it's built around **polling**, not webhooks. Wrong
  shape for us.
- **Raw `fetch`** (no library) is genuinely viable — the bot only needs a handful
  of API calls and the webhook is plain JSON. We rejected it for one reason:
  grammY gives us **typed updates and a button builder for free**, which is most
  of what a UI layer needs. Writing and maintaining that ourselves is busywork.
  (If grammY ever became a problem, dropping to raw fetch is a small, known step —
  our wrapper would absorb it.)

### What grammY actually does for us

- `webhookCallback(bot, "hono")` returns a Hono handler. One line to mount.
- It reads the `X-Telegram-Bot-Api-Secret-Token` header Telegram sends and
  **compares it in constant time**, returning 401 on mismatch. We don't write
  that check ourselves (same security posture as the Nomba webhook).
- Updates are fully typed — `ctx.message`, `ctx.callbackQuery.data`, `ctx.match`
  (the `/start <code>` payload) are correctly typed, no casts.
- `InlineKeyboard` is a small builder for buttons. This is the seed of our
  reusable UI layer (§4).

Dependencies grammY pulls: `@grammyjs/types` (pure types), `debug` (tiny),
`abort-controller` and `node-fetch` (legacy fallbacks that stay **inert on Bun**
because Bun has the globals). No native addons, no build toolchain.

---

## 3. How it slots into the engine

Same layering as everywhere else in Talli: `route → controller → service →
integration`. grammY lives only in the integration layer.

```
src/integrations/telegram/
  index.ts          builds the Bot, wires handlers, exports the Hono webhook handler
  client.ts         thin wrapper over bot.api (sendMessage, answerCallbackQuery, setWebhook)
  ui/               ← the reusable UI layer (§4) — buttons, cards, message text
    keyboards.ts
    messages.ts
  types.ts          shared types if we need them beyond grammY's
```

- The **integration** knows how to talk to Telegram and nothing about Talli rules.
- **Services** (`chat-link.service.ts`, later `collection.service.ts`) hold the
  rules: validate a link code, gate unlinked chats, decide what to send.
- The **controller/route** mounts the webhook and hands updates to services.

The webhook is mounted in the shared `webhook.route.ts`, alongside Nomba and
WhatsApp, under `/api/webhook/<provider>`:

```ts
// routes/webhook.route.ts
import { telegramWebhook } from "../integrations/telegram/index.js";
router.post("/webhook/telegram", telegramWebhook);
```

Registering the webhook with Telegram is a **one-time setup script** (like
`nomba-smoke.ts`), not something that runs on every boot:

```ts
// scripts/telegram-set-webhook.ts
await bot.api.setWebhook(`${env.PUBLIC_API_URL}/api/webhook/telegram`, {
  secret_token: env.TELEGRAM_WEBHOOK_SECRET,
  allowed_updates: ["message", "callback_query", "my_chat_member"],
});
```

> Note: `allowed_updates` is fixed at `setWebhook` time. If we later handle a new
> update type, we must re-run this script or those updates won't be delivered.

### The webhook URL is not baked in — change it anytime

Telegram remembers whichever URL we last sent via `setWebhook`. The URL only
appears in the setup script, built from `PUBLIC_API_URL`, so moving environments
is just re-running the script — no code change:

- **Dev:** Telegram can't reach `localhost:7291`, so `PUBLIC_API_URL` points at a
  public HTTPS tunnel (ngrok / cloudflared) forwarding to `:7291`.
- **Prod:** set `PUBLIC_API_URL` to the real domain and re-run the script;
  Telegram overwrites the old URL.

Check what's currently registered with `getWebhookInfo`. To stop delivery,
`deleteWebhook`.

---

## 4. The reusable UI layer (the important part)

The chat UI — buttons, confirmation cards, prompts — must be defined **once** and
reused, never rebuilt inline in handlers. We split it into two small files under
`integrations/telegram/ui/`.

**Why bother:** the same "Pay ₦3,000" button, the same "Connect Talli" prompt,
and the same confirm/cancel card show up across collections, savings, and send
flows. If they're written inline, every flow re-invents them and they drift. As
factories, a handler just calls `payButton(collection)` and the look is
consistent everywhere. When the wording or layout changes, it changes in one
place.

### 4.1 Keyboards — `ui/keyboards.ts`

Small functions that return an `InlineKeyboard`. Each owns one reusable control.

```ts
import { InlineKeyboard } from "grammy";

/** "Pay ₦X" button. callback_data carries the collection id so the tap resolves the member. */
export function payButton(collectionId: string, amount: number): InlineKeyboard {
  return new InlineKeyboard().text(`Pay ₦${amount.toLocaleString()}`, `pay:${collectionId}`);
}

/** Confirm / cancel pair — the parse-and-confirm card used before any money moves. */
export function confirmCancel(action: string): InlineKeyboard {
  return new InlineKeyboard()
    .text("✅ Confirm", `confirm:${action}`)
    .text("✖ Cancel", `cancel:${action}`);
}

/** "Connect Talli" — links an unlinked chat back to the dashboard. */
export function connectTalli(webAppUrl: string): InlineKeyboard {
  return new InlineKeyboard().url("Connect Talli", `${webAppUrl}/onboarding?connect=telegram`);
}
```

### 4.2 Messages — `ui/messages.ts`

The text that pairs with those keyboards, also as functions. Keeps wording and
formatting in one place.

```ts
export function collectionPrompt(title: string, amount: number, paidCount: number): string {
  return `*${title}* — ₦${amount.toLocaleString()} each.\nPaid so far: ${paidCount}`;
}

export function paymentConfirmed(name: string, amount: number, paidCount: number): string {
  return `✅ ${name} paid ₦${amount.toLocaleString()}. Paid: ${paidCount}`;
}

export const notLinked =
  "You need to authorize Talli first 👇";
```

### 4.3 How a handler uses them

The handler stays thin — it asks a service for data, then composes UI from the
factories. No button or text literals inline.

```ts
bot.callbackQuery(/^pay:(.+)$/, async (ctx) => {
  const collectionId = ctx.match[1];
  const { checkoutLink, amount } = await paymentService.startCollectionPayment({
    collectionId,
    platform: "telegram",
    platformUserId: String(ctx.from.id),
    displayName: ctx.from.first_name,
  });
  // open the pay page; the button text/url came from the UI layer earlier
  await ctx.answerCallbackQuery({ url: checkoutLink });
});
```

Rule of thumb: **if a button or a piece of message text appears in more than one
flow, it belongs in `ui/`, not in a handler.**

---

## 5. Config (already in `env.ts`)

```
TELEGRAM_BOT_TOKEN        the bot token from @BotFather
TELEGRAM_BOT_USERNAME     used to build t.me/<bot>?start=<code> deep links
TELEGRAM_WEBHOOK_SECRET   the secret_token; set on setWebhook AND checked per request
PUBLIC_API_URL            public https base for the webhook URL
CHAT_LINK_CODE_TTL_MINUTES   link-code lifetime (default 15)
```

The schema is also already modeled: `linked_chats`, `chat_link_codes`,
`bot_commands` in `src/prisma/schema/chat.prisma`.

---

## 6. First slice to build

The DM authorization loop from [`handoff-v1.md`](./handoff-v1.md) §13:

1. Dashboard issues a code → `chat_link_codes` row (hashed, 15-min TTL).
2. User opens `t.me/<bot>?start=<code>` → bot receives `/start <code>`.
3. Bot validates the code, creates a `linked_chats` row, confirms.
4. Any message from an **unlinked** chat is gated → "Connect Talli" prompt.

This needs: the `telegram/` integration (with `ui/`), a `chat-link.service.ts`,
and the webhook route. It does **not** depend on the payment loop, so it's a
clean parallel track to the Nomba work.

---

## 7. Groups: being added and tagged

This is the part that confuses people, so it's worth stating plainly.

### What the API will and won't give us

The bot runs in **privacy mode** (`can_read_all_group_messages: false`, the
@BotFather default — we keep it). In privacy mode, a bot in a group receives
**only**:

- messages that **@mention it** (`@trytalli_bot collect ₦5,000`),
- **replies** to one of the bot's own messages,
- **commands** (`/start`, `/collect@trytalli_bot`),
- **service updates** (added to / removed from a group, members joining).

It does **not** see ordinary group chatter. That's exactly what we want — Talli
should act only when explicitly addressed, never eavesdrop. So "being tagged"
*is* handleable: a mention arrives as a normal `message` update.

Two hard limits to design around:

- **No member roster.** There is no API to list a group's members, which is why
  collections are pay-to-enroll, not "N of M paid" (handoff §12.6).
- **No guaranteed first message.** The only moment we're certain to hear from a
  group is the `my_chat_member` update when the bot is added. We use that to post
  setup instructions, because we can't count on anyone tagging the bot first.

### The two update types we handle

| Trigger | Update | Handler |
|---|---|---|
| Bot added to a group | `my_chat_member` | `membership.handler.ts` |
| Admin links the group | `/start <code>` (a `message`) | `start.handler.ts` |
| Someone mentions/replies to the bot | `message` | `message.handler.ts` |

`my_chat_member` is **not** delivered unless listed in `allowed_updates` at
`setWebhook` time — our setup script includes it.

### The group flow

1. **Bot is added** → `my_chat_member` fires → bot posts a short intro telling a
   group admin to link the group with `/start <code>`.
2. **An admin links it** → admin generates a `group_link` code in the dashboard
   and posts `/start <code>` in the group. The handler checks the sender is a
   group admin (`getChatMember` → `administrator`/`creator`) — **non-admins are
   refused** so nobody can bind someone else's group. On success a `linked_chats`
   row is created with `chatType: "group"`.
3. **After linking** → mentions/replies reach `message.handler.ts`; an unlinked
   group is told to link first, a linked group falls through to command handling.

Group linking **reuses** the same `chat_link_codes` / `linked_chats` tables and
the same `chatLinkService.linkChat`; the only group-specific logic is the admin
check, which lives in the handler (it needs the grammY context), not the service.

### Where this lives in code

Inbound logic is **not** in `client.ts` (that's outbound-only). It sits in
`integrations/telegram/handlers/`, one file per concern, so `index.ts` stays a
thin wiring file:

```
handlers/
  shared.ts            safeReply, isGroupChat, isSenderAdmin
  start.handler.ts     /start — DM link + group link (admin-gated)
  message.handler.ts   DM gating + group mentions
  callback.handler.ts  inline-button taps
  membership.handler.ts  bot added / removed from a group
```

---

## 8. Gotchas to remember

- **Webhook, not polling.** Never call `bot.start()` when using `webhookCallback`
  — pick one. We use the webhook.
- **Ack fast.** Telegram resends an update if we don't return 2xx quickly. Slow
  work (DB, LLM, Nomba calls) should be kept short or offloaded, or Telegram
  retries cause duplicate processing. Add `bot.catch(...)` so an error doesn't
  loop forever as a 500.
- **`bot.init()` before serving** so `bot.botInfo` is populated on the first
  request.
- **Local dev** needs a public HTTPS tunnel (e.g. ngrok) for Telegram to reach the
  webhook, or use polling locally and webhook in deployed envs.
- The secret token only protects an **HTTPS** endpoint and must match on both
  `setWebhook` and the per-request check.
```
