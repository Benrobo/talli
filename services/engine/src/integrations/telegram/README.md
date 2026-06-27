# Telegram integration

Talli's Telegram bot, built on [grammY](https://grammy.dev) and served as a
**webhook** through the engine's Hono app. Like the Nomba SDK, grammY stays
behind this folder — the rest of the app never imports `grammy` directly.

Design rationale (why grammY, alternatives weighed): [`docs/telegram-sdk.md`](../../../../../docs/telegram-sdk.md).

## What works today

The DM authorization loop (handoff §13): the dashboard issues a one-time code,
the user opens `t.me/<bot>?start=<code>`, the bot links the chat, and unlinked
chats are gated. Verified end-to-end through the real webhook.

## Structure

```
integrations/telegram/
  index.ts          wiring only: builds the bot, registers handlers, exports:
                      - `bot`             the grammY instance (for scripts)
                      - `telegram`        TelegramClient for services to send with
                      - `telegramWebhook` the Hono webhook handler
  client.ts         TelegramClient — thin, error-swallowing wrapper over bot.api (outbound)
  types.ts          TalliContext + callback-data encode/decode helpers
  handlers/         inbound update handlers, one file per concern
    shared.ts         safeReply, isGroupChat, isSenderAdmin
    start.handler.ts  /start — DM link + group link (admin-gated)
    message.handler.ts  DM gating + group mentions
    callback.handler.ts inline-button taps
    membership.handler.ts  bot added / removed from a group
  ui/
    keyboards.ts    reusable inline-keyboard builders (payButton, confirmCancel, …)
    messages.ts     reusable message text
```

Layering: `webhook route → bot handlers → service`. Handlers are thin — they read
the update, call a service (`chatLinkService`), and reply using the `ui/` layer.
**Inbound** logic lives in `handlers/`; `client.ts` is **outbound** only. Group
handling (added to a group, tagged, admin linking) is explained in
[`docs/telegram-sdk.md`](../../../../../docs/telegram-sdk.md) §7.

## Reusable UI

Every button and message lives in `ui/`, defined once and reused across flows.
**If a button or message text appears in more than one flow, it belongs in `ui/`,
never inline in a handler.** A handler composes from the factories:

```ts
import { payButton } from "./ui/keyboards.js";
import { messages } from "./ui/messages.js";

await ctx.reply(messages.collectionPrompt(title, amount, paid), {
  reply_markup: payButton(collectionId, amount),
});
```

Callback data is `action:arg` (e.g. `pay:col_8af2`), built and parsed via
`encodeCallback` / `decodeCallback` so buttons and the handlers matching them
never drift.

## Sending from a service

```ts
import { telegram } from "../integrations/telegram/index.js";
import { payButton } from "../integrations/telegram/ui/keyboards.js";

await telegram.sendMessage(chatId, "Saturday football — pay below", payButton(id, 3000));
```

`TelegramClient` logs and swallows send failures, so a failed notification never
breaks the surrounding flow (e.g. a Nomba webhook). When you need the throw, call
`bot.api` directly.

## Webhook & security

`telegramWebhook` is grammY's `webhookCallback(bot, "hono")`. It verifies the
`X-Telegram-Bot-Api-Secret-Token` header (from `TELEGRAM_WEBHOOK_SECRET`) in
constant time and returns **401** on mismatch — the route needs no extra auth.

Handlers reply through a `safeReply` helper that never throws, so a send failure
(chat not found, bot blocked) still acks the webhook **200**. Otherwise Telegram
would retry the same update forever.

Mounted at `POST /api/webhook/telegram` (in the shared `webhook.route.ts`).

## Config

```
TELEGRAM_BOT_TOKEN        from @BotFather
TELEGRAM_BOT_USERNAME     builds t.me/<bot>?start=<code> deep links
TELEGRAM_WEBHOOK_SECRET   set on setWebhook AND verified per request
PUBLIC_API_URL            public https base for the webhook URL
WEB_APP_URL               dashboard URL for the Connect Talli button
CHAT_LINK_CODE_TTL_MINUTES   link-code lifetime (default 15)
```

## Scripts

```
# register / inspect / remove the webhook (URL built from PUBLIC_API_URL)
bun run scripts/telegram-set-webhook.ts set
bun run scripts/telegram-set-webhook.ts info
bun run scripts/telegram-set-webhook.ts delete

# smoke test: verifies the token + runs the full chat-link loop against the DB
bun run scripts/telegram-smoke.ts
bun run scripts/telegram-smoke.ts <chatId>   # also sends a real message
```

## Local development

Telegram can only deliver to a public HTTPS URL, so for live updates point
`PUBLIC_API_URL` at a tunnel (ngrok / cloudflared → `:7291`) and run
`telegram-set-webhook.ts set`. Without a tunnel you can still test everything via
the smoke script and by POSTing synthetic updates to the webhook with the secret
header.

## Next

- Group verification (the `group_link` purpose is wired through the schema/service
  but the group-admin flow isn't built).
- WhatsApp uses the same `chat_link_codes` / `linked_chats` model, keyed on
  `wa_id`, with a code typed as the first message (no `/start` deep link).
- The NL command parser replaces the `unrecognized` placeholder for linked chats.
