# WhatsApp bot — reusing the Telegram architecture

> Goal: add a WhatsApp bot that behaves like the Telegram bot, **reusing the
> same brain** (intent parsing, dispatch, services) and only swapping the
> platform-specific transport. WhatsApp is **private DM only** — there are no
> groups, mentions, or admin checks to worry about.

This doc explains, in plain terms, what we already have, what's missing, and the
exact steps to build it.

> **Provider note (read first).** There are two ways to reach WhatsApp:
> - **Official Meta Cloud API** — the "right" way (ToS-safe, signed webhooks),
>   but needs a Meta business portfolio + verification. Covered in §6/§7c.
> - **WasenderAPI** (unofficial, QR-linked WhatsApp Web) — what we use for the
>   **hackathon** because it skips all the Meta setup. Covered in **§7a-bis**.
>
> The whole point of the architecture below is that this choice only affects one
> file — `integrations/whatsapp/client.ts`. The brain, handlers, and webhook
> route are identical either way. **For the hackathon, read §1–§5 for the shape,
> then jump to §7a-bis for the actual provider.**
>
> Backup gateways in the same (unofficial, swap-only-`client.ts`) category if
> Wasender flakes: **Whapi.cloud**, **360dialog** (a real BSP — more legit),
> or **Baileys** (open-source, self-hosted, free).

---

## 1. The big picture: we already did the hard part

The Telegram bot is built in two layers:

```
        ┌─────────────────────────────────────────────┐
        │  PLATFORM LAYER  (Telegram-specific)         │
        │  integrations/telegram/                      │
        │  • receive webhook  • parse update           │
        │  • build reply text + buttons                │
        │  • send message back                         │
        └───────────────┬─────────────────────────────┘
                        │  DispatchContext  →
                        │  ←  DispatchResult
        ┌───────────────┴─────────────────────────────┐
        │  BRAIN  (platform-agnostic — already shared) │
        │  services/intent-dispatcher.service.ts       │
        │  services/command-parser.service.ts          │
        │  services/collection / split / wallet / ...  │
        └─────────────────────────────────────────────┘
```

**The brain doesn't know or care which chat app it's talking to.** It takes a
neutral `DispatchContext` (who sent what, in which workspace) and returns a
neutral `DispatchResult` (text to send, optional buttons). Telegram is just one
caller.

So building WhatsApp is mostly: **write a second platform layer** that does the
same four things (receive → parse → call brain → send) using Meta's WhatsApp
Cloud API instead of grammY.

### What's already in place (no work needed)

| Thing | Where | Status |
|---|---|---|
| `ChatPlatform` enum has `whatsapp` | [chat.prisma](../services/engine/src/prisma/schema/chat.prisma) | ✅ done |
| `LinkedChat`, `PlatformUser` keyed by `(platform, platformUserId)` | [chat.prisma](../services/engine/src/prisma/schema/chat.prisma) | ✅ multi-platform already |
| WhatsApp env vars | [config/env.ts](../services/engine/src/config/env.ts) | ✅ `WHATSAPP_ACCESS_TOKEN`, `WHATSAPP_PHONE_NUMBER_ID`, `WHATSAPP_VERIFY_TOKEN`, `WHATSAPP_APP_SECRET` |
| The whole brain (dispatcher + services) | [intent-dispatcher.service.ts](../services/engine/src/services/intent-dispatcher.service.ts) | ✅ platform-agnostic |
| `chatLinkService.findActiveChat(platform, chatId)` | [chat-link.service.ts](../services/engine/src/services/chat-link.service.ts) | ✅ takes a platform arg |
| `platformUserService.upsert({ platform, ... })` | [platform-user.service.ts](../services/engine/src/services/platform-user.service.ts) | ✅ takes a platform arg |

The schema even documents the intent — `platformUserId` is commented
`telegram from.id / whatsapp wa_id`.

---

## 2. The one thing that's *not* clean yet: buttons leak grammY

There is exactly **one** place where Telegram details leaked into the brain.
`DispatchResult` returns a grammY keyboard object:

```ts
// services/intent-dispatcher.service.ts  (today)
import type { InlineKeyboard } from "grammy";          // ← grammY in the brain

export interface DispatchResult {
  text: string;
  keyboard?: InlineKeyboard;     // ← grammY-specific
  checkoutUrl?: string;
  clarify?: { commandId: string };
}
```

WhatsApp can't render a grammY `InlineKeyboard`. WhatsApp has its own button
format (interactive "reply buttons", max 3) and link buttons work differently
(WhatsApp has no inline URL button — you send the URL as text or a CTA-URL
template).

**Fix: make the brain return platform-neutral "actions", and let each platform
layer translate them into its own buttons.** This is the only brain change.

```ts
// services/intent-dispatcher.service.ts  (proposed)

/** A neutral button. Each platform renders it its own way. */
export type DispatchButton =
  | { kind: "callback"; label: string; action: string }  // tap → comes back to us
  | { kind: "url"; label: string; url: string };          // opens a link

export interface DispatchResult {
  text: string;
  buttons?: DispatchButton[];        // ← was `keyboard: InlineKeyboard`
  checkoutUrl?: string;
  clarify?: { commandId: string };
}
```

Then the **Telegram** layer turns `buttons` into a grammY `InlineKeyboard`
(moving the code that's in `ui/keyboards.ts` today behind a small adapter), and
the **WhatsApp** layer turns the same `buttons` into WhatsApp interactive
buttons. The brain stays clean.

> If we want to keep this change small for v1, we can leave `checkoutUrl` as-is
> (both platforms already understand "here's a link to open") and only neutralize
> the confirm/cancel + pay buttons.

---

## 3. WhatsApp is simpler than Telegram (DM only)

A big chunk of the Telegram code exists **only** to handle group chats. WhatsApp
has none of that, so the WhatsApp layer is smaller:

| Telegram concern | WhatsApp |
|---|---|
| Group vs private (`isGroupChat`) | always `private` — hardcode `scope: "private"` |
| `@mention` detection to act in groups | n/a — act on every message |
| `force_reply` for group clarifications | n/a — next message is the answer (like a Telegram DM) |
| Group admin checks (`isSenderAdmin`) | n/a — `isGroupAdmin: true` always |
| `my_chat_member` (added/removed from group) | n/a |

So in the WhatsApp `DispatchContext`, the chat-type fields are constant:

```ts
const dispatchCtx: DispatchContext = {
  scope: "private",          // WhatsApp is always a DM
  isGroupAdmin: true,        // no groups, so never blocked by admin gate
  platform: "whatsapp",
  workspaceId: linked.workspaceId,
  linkedChatId: linked.id,
  senderPlatformId: waId,    // the sender's wa_id (phone number)
  ownerUserId: workspace.ownerUserId,
  workspaceName: workspace.name,
  senderName: platformUserService.formatName(identity),
};
```

This is the same shape Telegram builds in
[message.handler.ts](../services/engine/src/integrations/telegram/handlers/message.handler.ts) —
just with the group bits removed.

---

## 4. File-by-file: what to copy, adapt, or write new

Proposed new folder, mirroring `integrations/telegram/`:

```
integrations/whatsapp/
  client.ts        NEW   — thin Meta Cloud API client (send text / buttons)
  index.ts         NEW   — webhook verify (GET) + receive (POST), routes updates
  types.ts         NEW   — WhatsApp payload types + a TalliWaContext
  handlers/
    message.handler.ts   NEW   — the DM message loop (≈ Telegram's, minus groups)
    pay.handler.ts       ADAPT — reuse pay logic, send WhatsApp-shaped reply
    confirm.handler.ts   ADAPT — reuse confirm/cancel logic
  ui/
    messages.ts    REUSE  — share the Telegram ui/messages.ts (see §5)
    buttons.ts     NEW   — DispatchButton → WhatsApp interactive buttons
```

| Telegram file | WhatsApp plan |
|---|---|
| `bot.ts`, `client.ts` (grammY) | **New** `client.ts` — plain `fetch` to Meta Graph API; no SDK needed |
| `index.ts` (webhookCallback) | **New** `index.ts` — Meta needs a GET verify + POST receive |
| `handlers/message.handler.ts` | **New**, but ~60% copy; drop group/mention/force_reply branches |
| `handlers/confirm.handler.ts` | **Adapt** — same `intentDispatcherService.confirm()` call |
| `handlers/pay.handler.ts` | **Adapt** — same pending-payment flow; render WhatsApp reply |
| `handlers/start/disconnect/info/balance/receipt` | Port as needed; all call the same services |
| `handlers/photo.handler.ts` | Later — WhatsApp media is a 2-step download; defer |
| `handlers/membership.handler.ts`, `shared.ts` (group helpers) | **Skip** — group-only |
| `ui/messages.ts` | **Share** — see §5 |
| `ui/keyboards.ts` (grammY) | Replaced by `ui/buttons.ts` (WhatsApp) + a Telegram adapter |

---

## 5. Sharing the reply text (`ui/messages.ts`)

`ui/messages.ts` (626 lines) is almost all plain strings and string-builders —
the actual product copy ("🔒 Only a group admin can…", balance summaries, etc.).
That's worth sharing, not duplicating.

**Catch:** some of it uses Telegram **Markdown** (`*bold*`). WhatsApp uses a
different syntax (`*bold*` is the same, but `_italic_`, and no `[text](url)`
links — links must be raw URLs). Two options:

1. **v1 (fast):** import `messages` as-is. Most copy is plain text and renders
   fine; fix the few Markdown-link cases for WhatsApp inline.
2. **clean:** move `messages` to a shared location (e.g. `services/ui/messages.ts`
   or `lib/messages.ts`) and have each platform apply its own formatter. Keep the
   strings neutral; format at send time.

Recommend (1) for the first working bot, then (2) if formatting bugs pile up.

---

## 6. The WhatsApp transport, concretely

### 6a. Webhook: verify (GET) + receive (POST)

Meta's Cloud API requires **two** things on the same URL, unlike Telegram's
single POST:

- `GET /webhook/whatsapp` — a one-time verification handshake (echo `hub.challenge`)
- `POST /webhook/whatsapp` — incoming messages

We mount both next to the Telegram route in
[webhook.route.ts](../services/engine/src/routes/webhook.route.ts):

```ts
// routes/webhook.route.ts
import { whatsappVerify, whatsappWebhook } from "../integrations/whatsapp/index.js";

router.get(`${basePath}/whatsapp`, whatsappVerify);    // Meta verification handshake
router.post(`${basePath}/whatsapp`, whatsappWebhook);  // incoming messages
```

```ts
// integrations/whatsapp/index.ts
import type { Context } from "hono";
import env from "../../config/env.js";
import { whatsapp } from "./client.js";
import { handleWaMessage } from "./handlers/message.handler.js";

/** Meta calls this once when you set the webhook URL. Echo the challenge back. */
export function whatsappVerify(c: Context) {
  const mode = c.req.query("hub.mode");
  const token = c.req.query("hub.verify_token");
  const challenge = c.req.query("hub.challenge");
  if (mode === "subscribe" && token === env.WHATSAPP_VERIFY_TOKEN) {
    return c.text(challenge ?? "");          // 200 with the challenge = verified
  }
  return c.text("Forbidden", 403);
}

/** Incoming messages. Always 200 fast, then process — Meta retries on non-200. */
export async function whatsappWebhook(c: Context) {
  const raw = await c.req.text();                            // RAW body for the HMAC
  if (!whatsapp.verifySignature(raw, c.req.header("x-hub-signature-256"))) {
    return c.text("Forbidden", 403);                         // reject forged calls
  }
  const msg = extractMessage(JSON.parse(raw));               // dig out the message
  if (msg) await handleWaMessage(msg);                        // call the brain
  return c.json({ status: "ok" });                           // ack immediately
}
```

Meta's payload is deeply nested; `extractMessage` pulls out the bits we need:

```ts
// the shape we hand to the handler — our own neutral type
export interface WaIncoming {
  waId: string;        // sender's phone number id (their identity)
  name?: string;       // pushName from the contacts array
  text?: string;       // message body (for text messages)
  buttonReply?: string;// id of a tapped interactive button (our `action`)
}

function extractMessage(body: any): WaIncoming | null {
  const value = body?.entry?.[0]?.changes?.[0]?.value;
  const msg = value?.messages?.[0];
  if (!msg) return null;                                  // status callbacks, etc.
  return {
    waId: msg.from,
    name: value?.contacts?.[0]?.profile?.name,
    text: msg.text?.body,
    buttonReply: msg.interactive?.button_reply?.id,        // tapped button → action id
  };
}
```

### 6b. The message handler (the DM loop)

This is the WhatsApp twin of `message.handler.ts`, minus all group logic:

```ts
// integrations/whatsapp/handlers/message.handler.ts
import prisma from "../../../prisma/index.js";
import { chatLinkService } from "../../../services/chat-link.service.js";
import { intentDispatcherService, type DispatchContext } from "../../../services/intent-dispatcher.service.js";
import { botCommandService } from "../../../services/bot-command.service.js";
import { platformUserService } from "../../../services/platform-user.service.js";
import { messages } from "../ui/messages.js";
import { whatsapp } from "../client.js";
import type { WaIncoming } from "../types.js";

export async function handleWaMessage(msg: WaIncoming): Promise<void> {
  // a tapped button comes back as an action id, not text → route like a callback
  if (msg.buttonReply) return handleWaButton(msg);

  const text = msg.text?.trim();
  if (!text) return;

  const linked = await chatLinkService.findActiveChat("whatsapp", msg.waId);
  if (!linked) {
    await whatsapp.sendText(msg.waId, messages.notLinked);   // tell them to connect
    return;
  }

  const workspace = await prisma.workspace.findUnique({
    where: { id: linked.workspaceId },
    select: { name: true, ownerUserId: true },
  });
  if (!workspace) return void whatsapp.sendText(msg.waId, messages.actionFailed);

  const identity = await platformUserService.upsert({
    platform: "whatsapp",
    platformUserId: msg.waId,
    firstName: msg.name,
  });

  const ctx: DispatchContext = {
    scope: "private",
    isGroupAdmin: true,
    platform: "whatsapp",
    workspaceId: linked.workspaceId,
    linkedChatId: linked.id,
    senderPlatformId: msg.waId,
    ownerUserId: workspace.ownerUserId,
    workspaceName: workspace.name,
    senderName: platformUserService.formatName(identity),
  };

  // same brain calls as Telegram. DM clarifications: the next message is the
  // answer, so the pending-reply lookup is by sender (no message-id matching).
  const pending = await botCommandService.findPendingForReply(linked.id, msg.waId, false);
  const result = pending
    ? await intentDispatcherService.continue(pending.id, text, ctx)
    : await intentDispatcherService.handleMessage(text, ctx);

  // our in-house client picks text vs buttons based on what's present (§6c)
  await whatsapp.sendButtons(msg.waId, result.text, result.buttons ?? []);
}
```

Notice: **every `intentDispatcherService` / service call is identical to
Telegram.** Only the transport (`sendWa`) and the constant chat-scope differ.

### 6c. The client — our own tiny in-house SDK (no dependency)

We are **not** adding a third-party WhatsApp package. Instead we build a small
client class over raw `fetch`, exactly like the existing
[`TelegramClient`](../services/engine/src/integrations/telegram/client.ts) wraps
grammY's `bot.api`. The rest of the code never touches `fetch` or Meta's payload
shapes — it calls clean methods (`wa.sendText`, `wa.sendButtons`, …). This *is*
our SDK; we own it, it's typed to exactly what we use, and it stays consistent
with the Telegram side (errors logged-and-swallowed so a failed send can't break
the flow).

```ts
// integrations/whatsapp/client.ts
import { createHmac, timingSafeEqual } from "node:crypto";
import env from "../../config/env.js";
import logger from "../../lib/logger.js";
import type { DispatchButton } from "../../services/intent-dispatcher.service.js";

const GRAPH = "https://graph.facebook.com/v21.0";

/** A WhatsApp list row (used when there are too many options for buttons). */
export interface WaListRow {
  id: string;       // comes back to us as the chosen action
  title: string;    // ≤ 24 chars
  description?: string;
}

/**
 * Thin wrapper over the Meta WhatsApp Cloud API so the rest of the app sends
 * without knowing Meta's payload shapes. Mirrors `TelegramClient`: every method
 * logs and swallows failures. This is Talli's in-house WhatsApp SDK — raw fetch
 * underneath, typed surface on top.
 */
export class WhatsAppClient {
  constructor(
    private readonly phoneNumberId = env.WHATSAPP_PHONE_NUMBER_ID,
    private readonly accessToken = env.WHATSAPP_ACCESS_TOKEN
  ) {}

  /** Low-level POST to the messages endpoint. Internal — methods below use it. */
  private async post(payload: Record<string, unknown>): Promise<void> {
    try {
      const res = await fetch(`${GRAPH}/${this.phoneNumberId}/messages`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${this.accessToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ messaging_product: "whatsapp", ...payload }),
      });
      if (!res.ok) {
        logger.error(`[whatsapp] send failed ${res.status}: ${await res.text()}`);
      }
    } catch (err) {
      logger.error(`[whatsapp] send threw: ${(err as Error).message}`);
    }
  }

  /** Plain text message. */
  async sendText(to: string, body: string): Promise<void> {
    await this.post({ to, type: "text", text: { body } });
  }

  /** Text + up to 3 interactive reply buttons (titles ≤ 20 chars). */
  async sendButtons(to: string, body: string, buttons: DispatchButton[]): Promise<void> {
    const replies = buttons.filter((b) => b.kind === "callback").slice(0, 3);
    if (replies.length === 0) return this.sendText(to, body);
    await this.post({
      to,
      type: "interactive",
      interactive: {
        type: "button",
        body: { text: body },
        action: {
          buttons: replies.map((b) => ({
            type: "reply",
            reply: { id: b.action, title: b.label.slice(0, 20) },
          })),
        },
      },
    });
  }

  /** A single-select list (for >3 options, e.g. "pick a collection"). */
  async sendList(to: string, body: string, buttonLabel: string, rows: WaListRow[]): Promise<void> {
    await this.post({
      to,
      type: "interactive",
      interactive: {
        type: "list",
        body: { text: body },
        action: {
          button: buttonLabel.slice(0, 20),
          sections: [{ rows: rows.slice(0, 10).map((r) => ({
            id: r.id, title: r.title.slice(0, 24), description: r.description?.slice(0, 72),
          })) }],
        },
      },
    });
  }

  /** Send an image by URL (e.g. a receipt). WhatsApp fetches the URL itself. */
  async sendImage(to: string, link: string, caption?: string): Promise<void> {
    await this.post({ to, type: "image", image: { link, caption } });
  }

  /** Mark the user's message as read (the blue ticks). Optional but nice UX. */
  async markRead(messageId: string): Promise<void> {
    await this.post({ status: "read", message_id: messageId });
  }

  /**
   * Verify an inbound webhook's `X-Hub-Signature-256` against the app secret.
   * MUST run on the RAW request body, before JSON parsing. Returns false on any
   * mismatch so the caller can reject the request.
   */
  verifySignature(rawBody: string, signatureHeader: string | undefined): boolean {
    if (!signatureHeader) return false;
    const expected = "sha256=" + createHmac("sha256", env.WHATSAPP_APP_SECRET)
      .update(rawBody)
      .digest("hex");
    const a = Buffer.from(expected);
    const b = Buffer.from(signatureHeader);
    return a.length === b.length && timingSafeEqual(a, b);
  }
}

/** Single shared instance, like `telegram` is exported from telegram/bot.ts. */
export const whatsapp = new WhatsAppClient();
```

Now the handler's send call (`sendWa(...)` in §6b) becomes the natural
`whatsapp.sendButtons(to, text, buttons)` / `whatsapp.sendText(to, text)`, and
the webhook (§6a) uses `whatsapp.verifySignature(rawBody, header)` before
trusting the payload.

> WhatsApp limits baked into the client: **3 reply buttons** (titles ≤ 20 chars),
> **list** for up to 10 rows. The Telegram confirm card is Confirm/Cancel (2) and
> pay is 1 — all fit `sendButtons`. "Select a collection" maps to `sendList`.

---

## 7. Security & gotchas (don't skip)

- **Verify the webhook signature.** Meta signs every POST with
  `X-Hub-Signature-256` (HMAC-SHA256 of the raw body using `WHATSAPP_APP_SECRET`).
  Our client's `verifySignature()` (§6c) does this — call it on the **raw** body
  before `JSON.parse`. It's the WhatsApp equivalent of Telegram's `secretToken`.
- **Ack fast, process after.** Meta retries if you don't 200 within seconds, and
  retries can duplicate. Return `200` immediately, then do the work. Our
  pending-payment crediting is already idempotent, but message handling should
  tolerate the same update arriving twice.
- **24-hour window.** Outside 24h since the user's last message, WhatsApp only
  allows pre-approved **template** messages, not free-form text. Fine for
  reply-style bots (we always reply to a user message); matters if we later push
  unprompted notifications (e.g. "someone paid your collection") — those need an
  approved template.
- **Identity = phone number.** `waId` is the user's phone number. That's the
  `platformUserId`. The chat-link flow (connect-code) works the same as Telegram.

---

## 7b. Two small service tweaks (besides buttons)

Aside from neutralizing buttons (§2), the audit found two minor Telegram leaks in
otherwise platform-agnostic services:

- **`chatLinkService.buildDeepLink()`** already has a WhatsApp branch — it just
  returns the raw code as a placeholder today:

  ```ts
  // services/chat-link.service.ts (today)
  private buildDeepLink(platform: ChatPlatform, code: string): string {
    if (platform === "telegram") {
      return `https://t.me/${env.TELEGRAM_BOT_USERNAME}?start=${code}`;
    }
    return code;   // ← WhatsApp placeholder — fill this in
  }
  ```

  Give it a real WhatsApp deep link: `https://wa.me/<PHONE>?text=connect%20<code>`
  (prefills the connect message so the user just hits send).

- **`BotCommand.clarifyMessageId` is an `Int`** (a Telegram message id), used to
  match a group `force_reply` answer back to its question. WhatsApp doesn't use
  this — DM clarifications match by sender, not message id (we pass `isGroup:
  false` to `findPendingForReply`, which skips the id check). So WhatsApp simply
  leaves `clarifyMessageId` null. No schema change needed for v1; only rename it
  to something neutral (`clarifyReferenceId`) if we ever want WhatsApp to match a
  specific message.

## 7a-bis. Provider choice — WasenderAPI for the hackathon

The official Meta Cloud API (everything above) needs a **business portfolio +
verification**, which is blocked on Meta flagging the personal FB account. For the
**hackathon** we use **[WasenderAPI](https://wasenderapi.com)** instead — an
unofficial gateway that automates WhatsApp Web. No Meta app, no portfolio, no
verification: you scan a QR with a (burner) WhatsApp number and you're live.

> ⚠️ **Hackathon-only.** This is WhatsApp-Web automation — against WhatsApp ToS,
> the number can be banned, no SLA. Fine for a demo on a throwaway number; **not**
> for production money flows. Post-hackathon, migrate to the official Cloud API
> (§7c) — only `client.ts` changes, the brain and handlers don't.

**Why it's easy:** the whole API is two calls.

- **Send:** `POST https://www.wasenderapi.com/api/send-message`
  - Header: `Authorization: Bearer <API_KEY>`
  - Body: `{ "to": "+2348012345678", "text": "..." }` (E.164 number)
- **Receive:** webhook `POST` to our URL, `event: "messages.received"`:
  ```json
  {
    "event": "messages.received",
    "data": { "messages": {
      "key": { "fromMe": false, "cleanedSenderPn": "2348012345678", "remoteJid": "..." },
      "message": { "conversation": "split 30k 3 ways" }
    } }
  }
  ```
  - ⚠️ **Use `key.cleanedSenderPn`** (the clean phone number) as the user's id —
    **not** `remoteJid`, which can be an internal `@lid`.
  - Text is at `data.messages.message.conversation`.
- **Verify:** the request carries an `x-webhook-signature` header that is just a
  **plain shared secret** you set (NOT an HMAC) — compare it for equality.

**No buttons.** Wasender sends text/media/polls only — no interactive reply
buttons or lists. So our `DispatchButton[]` (§2) renders on Wasender as a
**numbered text menu** ("Reply *1* to confirm, *2* to cancel"), and the inbound
handler maps a reply of "1"/"2" back to the button's action. This is the payoff
of neutralizing buttons in the brain: same result, different rendering.

### The Wasender client (same in-house shape as §6c)

```ts
// integrations/whatsapp/client.ts  (Wasender variant)
import env from "../../config/env.js";
import logger from "../../lib/logger.js";
import type { DispatchButton } from "../../services/intent-dispatcher.service.js";

const SEND_URL = "https://www.wasenderapi.com/api/send-message";

export class WhatsAppClient {
  constructor(private readonly apiKey = env.WASENDER_API_KEY) {}

  private async send(to: string, text: string): Promise<void> {
    try {
      const res = await fetch(SEND_URL, {
        method: "POST",
        headers: { Authorization: `Bearer ${this.apiKey}`, "Content-Type": "application/json" },
        body: JSON.stringify({ to, text }),
      });
      if (!res.ok) logger.error(`[whatsapp] send failed ${res.status}: ${await res.text()}`);
    } catch (err) {
      logger.error(`[whatsapp] send threw: ${(err as Error).message}`);
    }
  }

  /** Plain text. */
  async sendText(to: string, body: string): Promise<void> {
    await this.send(to, body);
  }

  /** No native buttons on Wasender → render as a numbered text menu. */
  async sendButtons(to: string, body: string, buttons: DispatchButton[]): Promise<void> {
    const taps = buttons.filter((b) => b.kind === "callback");
    if (taps.length === 0) return this.sendText(to, body);
    const menu = taps.map((b, i) => `${i + 1}. ${b.label}`).join("\n");
    await this.send(to, `${body}\n\n${menu}\n\n_Reply with the number._`);
  }

  /** Plain shared-secret check (Wasender does not HMAC). */
  verifySignature(signature: string | undefined): boolean {
    return !!signature && signature === env.WASENDER_WEBHOOK_SECRET;
  }
}

export const whatsapp = new WhatsAppClient();
```

The handler maps a numbered reply back to an action by remembering the menu it
last sent for that chat (store the `action` list on the pending `BotCommand`, or
re-derive it from the pending intent — same place the confirm/cancel actions are
already known).

### Env vars for Wasender

Add to [config/env.ts](../services/engine/src/config/env.ts) (the `WHATSAPP_*`
Meta vars can stay for the later migration):

```ts
WASENDER_API_KEY: z.string().default(""),
WASENDER_WEBHOOK_SECRET: z.string().default(""),
```

### Wasender setup (5 minutes, no Meta)

1. Sign up at <https://wasenderapi.com> → pick the **$6/mo** plan (1 number).
2. **Create a session** → it shows a **QR code**.
3. On the phone with your (burner) WhatsApp number: **Settings → Linked Devices
   → Link a device → scan**. Session goes "connected."
4. **API key:** copy it from the dashboard → `WASENDER_API_KEY`.
5. **Webhook:** in the session/webhook settings, set the URL to
   `https://<tunnel>/api/webhook/whatsapp` and set a **webhook secret** (any
   random string) → put the same value in `WASENDER_WEBHOOK_SECRET`. Subscribe to
   the **messages.received** event.
6. Use `ngrok http 7291` (or similar) for the public URL during the hackathon.

There is an official `wasenderapi` npm/PyPI SDK, but we keep the raw-`fetch`
in-house client to stay dependency-free and consistent with `TelegramClient`.

---

## 7c. (Post-hackathon) Official Cloud API — how to obtain the tokens & secrets

All four env vars come from Meta's developer platform. WhatsApp Cloud API is free
to start (Meta hosts it; you don't run anything). Steps:

**1. Create a Meta app**
- Go to <https://developers.facebook.com/> → log in → **My Apps** → **Create App**.
- Choose type **Business**. Give it a name (e.g. "Talli").
- On the app dashboard, find **WhatsApp** and click **Set up**. This attaches the
  WhatsApp product and auto-creates a **test phone number** you can use
  immediately (no real SIM needed for development).

**2. `WHATSAPP_PHONE_NUMBER_ID`**
- WhatsApp → **API Setup** (a.k.a. Getting Started). Under "Send and receive
  messages" you'll see **Phone number ID** — copy it. (This is *not* the phone
  number itself; it's the numeric id beside it.)
- For production you later add your **own** business number here (needs a number
  that is not already on a WhatsApp account, plus business verification).

**3. `WHATSAPP_ACCESS_TOKEN`**
- On the same **API Setup** page there's a **temporary access token** (valid
  ~24h) — fine for first tests.
- For a token that doesn't expire, create a **System User** token:
  **Business Settings** → **Users → System users** → add a system user (admin)
  → **Generate new token** → select your app → grant scopes
  **`whatsapp_business_messaging`** and **`whatsapp_business_management`** →
  choose **never expire**. Copy that token. (Store it as a secret; it can send
  messages from your number.)

**4. `WHATSAPP_VERIFY_TOKEN`**
- This one **you invent** — any random string (e.g. `openssl rand -hex 16`). It's
  a shared password for the webhook handshake (§6a). You type the same value in
  two places: the env var here, and the Meta webhook config (next step). It must
  match.

**5. `WHATSAPP_APP_SECRET`**
- App dashboard → **App settings → Basic** → **App secret** → **Show**. Copy it.
- This is what signs inbound webhooks (`verifySignature`, §6c). Keep it secret.

**6. Register the webhook URL**
- WhatsApp → **Configuration** → **Webhook** → **Edit**.
- **Callback URL:** `https://<your-public-host>/api/webhook/whatsapp`
- **Verify token:** the same string you put in `WHATSAPP_VERIFY_TOKEN`.
- Meta immediately calls your `GET` route to verify (§6a); it must echo
  `hub.challenge`. Then **Subscribe** to the **`messages`** field so you receive
  incoming messages.
- For local dev, expose your engine with a tunnel (e.g. `ngrok http 7291`) and
  use the tunnel URL as the callback.

**7. Test**
- API Setup page → send a test message to your own WhatsApp number (you must add
  your number to the **recipient allow-list** while the app is in dev mode).
- Reply to the bot; your `POST` webhook should fire. Watch the logs.

> **Dev vs production:** in dev mode you can only message a short allow-list of
> numbers, and the test number can't receive from the public. Going live needs
> **Business Verification** + adding/registering your real number. Free tier
> covers service (user-initiated) conversations within the 24h window; marketing
> templates are billed.

## 8. Suggested build order

1. **Neutralize buttons in the brain** (§2) — small, unblocks both platforms.
   Add a Telegram adapter so the existing bot keeps working unchanged.
2. **Webhook plumbing** (§6a) — verify handshake + receive + signature check.
   Test with Meta's "send test message" until updates arrive.
3. **Text-only message loop** (§6b + `sendWa` text path) — get a round-trip:
   user texts → brain → reply. No buttons yet.
4. **Buttons** — confirm/cancel + pay via interactive reply buttons.
5. **Chat-link / `/start` equivalent** — WhatsApp has no `/start`; use a keyword
   ("hi", "connect") or deep link `https://wa.me/<number>?text=connect`.
6. **Port remaining commands** (balance, receipts) as needed.
7. **Media (photos/receipts)** — last; WhatsApp media is a 2-step download.

---

## 9. One-paragraph summary

The brain (intent parsing + dispatch + all the money services) is already
platform-agnostic and the database already models `whatsapp` as a first-class
platform, with env vars in place. Building the WhatsApp bot is writing a second
**transport layer** under `integrations/whatsapp/` that (1) receives Meta Cloud
API webhooks, (2) builds the same `DispatchContext` we build for Telegram —
always `scope: "private"` since WhatsApp has no groups, (3) calls the exact same
`intentDispatcherService`, and (4) sends the reply via our own small
`WhatsAppClient` (raw `fetch` over Meta's Cloud API — an in-house SDK, no
dependency, mirroring how `TelegramClient` wraps grammY). The only
change inside the brain is replacing the grammY `InlineKeyboard` in
`DispatchResult` with neutral `DispatchButton[]` that each platform renders its
own way.
```
