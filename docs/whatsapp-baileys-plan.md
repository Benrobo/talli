# WhatsApp via Baileys — self-hosted, with real buttons

> Companion to [`whatsapp-bot-plan.md`](./whatsapp-bot-plan.md) (architecture) and
> [`whatsapp-providers-buttons.md`](./whatsapp-providers-buttons.md) (hosted
> gateways). This doc is the **Baileys** path: run the WhatsApp connection
> ourselves instead of paying a gateway, which gives us full control — including
> the "hack" needed to get **tappable buttons** working.

[Baileys](https://github.com/WhiskeySockets/Baileys) is the open-source
WebSockets library that every unofficial gateway (Wasender, Evolution, WAHA's
NOWEB engine) is built on top of. Using it directly = no middleman, no monthly
fee, and we can craft the raw protocol messages the hosted gateways won't.

> ⚠️ Same caveat as all unofficial routes: *"not affiliated… with WhatsApp"*,
> against ToS, **ban risk** — use a burner number, hackathon-only.

---

## Why Baileys solves the button problem

Hosted gateways can't reliably send buttons because Meta gated native buttons to
the official Cloud API (see the providers doc). But Baileys lets us send the
**raw `interactiveMessage` protocol payload** ourselves, and the community has
maintained forks that package exactly that:

- **[itsliaaa/baileys](https://github.com/itsliaaa/baileys)** — Baileys v7 +
  interactive messages (buttons, lists, native flows, carousels), albums.
- **[@fizzxydev/baileys-pro](https://www.npmjs.com/package/@fizzxydev/baileys-pro)**,
  **baileys-x**, several `bails` forks — same idea, button/interactive support.

These craft the message so WhatsApp renders tappable buttons (most reliable when
the **recipient** uses WhatsApp, and even better toward WhatsApp Business
clients). It's not guaranteed forever (Meta can change the protocol), but it's the
best shot at real buttons on an unofficial stack — and if a device doesn't render
them, the tap still returns the row/button id, and we keep our poll/text
fallback.

**Recommendation:** start on a button-capable fork (e.g. `itsliaaa/baileys`),
keep the same `DispatchButton[]` → buttons|list|poll|text fallback from the plan
doc. If the fork gets flaky, dropping back to vanilla `baileys` + polls is a
one-line change.

---

## The two questions you raised

### "Can the bot DM users directly / without them saving a contact?"

**Yes.** Baileys sends to a **JID** built straight from the phone number — no
contact entry needed:

```ts
const jid = `${phoneE164WithoutPlus}@s.whatsapp.net`;  // e.g. 2348012345678@s.whatsapp.net
await sock.sendMessage(jid, { text: "Hi from Talli 👋" });
```

Check a number is on WhatsApp first (avoid sending into the void):

```ts
const [res] = await sock.onWhatsApp("2348012345678");
if (res?.exists) await sock.sendMessage(res.jid, { text: "..." });
```

So both directions work programmatically:
- **User → bot:** they message the bot's number. Easiest entry: a
  `https://wa.me/<botNumber>?text=connect%20<code>` deep link that prefills the
  connect message (the WhatsApp equivalent of Telegram's `/start <code>`).
- **Bot → user:** we DM any number via its JID (e.g. "someone paid your
  collection"). ⚠️ Cold outbound to people who never messaged us is the most
  ban-prone behavior — keep bot-initiated DMs to users who opted in (paid /
  connected).

### "Hack our way around it"

That's exactly the Baileys approach: we own the socket, so we can send the
interactive payloads gateways can't, build the connect flow however we like
(deep link, keyword, QR), and not depend on a third party's feature gating.

---

## How it fits our architecture (still one swappable file)

Nothing in the brain changes. Baileys is just another implementation of the same
platform layer described in `whatsapp-bot-plan.md` (§1, §6). The only structural
difference vs a hosted gateway: **Baileys is a long-lived WebSocket, not a
webhook** — so instead of an HTTP route receiving updates, we hold a socket and
listen to `messages.upsert`.

```
integrations/whatsapp/
  baileys.ts       NEW  — create socket, auth state, reconnect, QR logging
  client.ts        NEW  — WhatsAppClient: sendText / sendButtons / sendList (our SDK)
  handlers/
    message.handler.ts   NEW — the DM loop (same brain calls as Telegram, scope:"private")
  ui/...           shared with Telegram per the plan doc
```

There's **no `/webhook/whatsapp` route** in the Baileys variant — the socket
lives inside the engine process and is started at boot (next to where the
Telegram bot is wired). Everything downstream (`intentDispatcherService`,
services) is identical.

---

## Concrete code

### 1. Connect + auth (QR, persisted session)

```ts
// integrations/whatsapp/baileys.ts
import makeWASocket, {
  useMultiFileAuthState,
  DisconnectReason,
} from "baileys";                       // or "@itsliaaa/baileys" for buttons
import { Boom } from "@hapi/boom";
import logger from "../../lib/logger.js";
import { handleWaMessage } from "./handlers/message.handler.js";

let sock: ReturnType<typeof makeWASocket>;

export async function startWhatsApp(): Promise<void> {
  // NOTE: useMultiFileAuthState is demo-grade; for prod persist creds in DB/R2.
  const { state, saveCreds } = await useMultiFileAuthState("./.wa-auth");

  sock = makeWASocket({ auth: state, printQRInTerminal: true });

  sock.ev.on("creds.update", saveCreds);                  // keep session across restarts

  sock.ev.on("connection.update", ({ connection, lastDisconnect, qr }) => {
    if (qr) logger.info("[whatsapp] scan this QR to link the bot number");
    if (connection === "close") {
      const code = (lastDisconnect?.error as Boom)?.output?.statusCode;
      const loggedOut = code === DisconnectReason.loggedOut;
      logger.warn(`[whatsapp] connection closed (${code}) — ${loggedOut ? "logged out" : "reconnecting"}`);
      if (!loggedOut) startWhatsApp();                     // auto-reconnect
    } else if (connection === "open") {
      logger.info("[whatsapp] connected");
    }
  });

  sock.ev.on("messages.upsert", async ({ messages, type }) => {
    if (type !== "notify") return;                         // ignore history sync
    for (const m of messages) {
      if (!m.message || m.key.fromMe) continue;
      await handleWaMessage(m);
    }
  });
}

export function getSock() {
  if (!sock) throw new Error("WhatsApp socket not started");
  return sock;
}
```

Scan the QR once (logs to the terminal); `./.wa-auth` keeps the session so
restarts don't re-prompt. (For the hackathon a file is fine; for prod, store
creds in Postgres/R2 — the docs explicitly warn `useMultiFileAuthState` is
demo-grade.)

### 2. The in-house client (our SDK — same shape as the plan doc §6c)

```ts
// integrations/whatsapp/client.ts
import { getSock } from "./baileys.js";
import logger from "../../lib/logger.js";
import type { DispatchButton } from "../../services/intent-dispatcher.service.js";

const toJid = (phone: string) => `${phone.replace(/\D/g, "")}@s.whatsapp.net`;

export class WhatsAppClient {
  async sendText(phone: string, body: string): Promise<void> {
    try {
      await getSock().sendMessage(toJid(phone), { text: body });
    } catch (err) {
      logger.error(`[whatsapp] sendText failed: ${(err as Error).message}`);
    }
  }

  /** Tappable buttons (needs a button-capable fork). ≤3 quick replies. */
  async sendButtons(phone: string, body: string, buttons: DispatchButton[]): Promise<void> {
    const taps = buttons.filter((b) => b.kind === "callback").slice(0, 3);
    if (taps.length === 0) return this.sendText(phone, body);
    try {
      await getSock().sendMessage(toJid(phone), {
        text: body,
        footer: "Talli",
        buttons: taps.map((b) => ({ buttonId: b.action, buttonText: { displayText: b.label }, type: 1 })),
        headerType: 1,
      });
    } catch (err) {
      logger.error(`[whatsapp] sendButtons failed, falling back to text: ${(err as Error).message}`);
      // graceful fallback: numbered menu
      const menu = taps.map((b, i) => `${i + 1}. ${b.label}`).join("\n");
      await this.sendText(phone, `${body}\n\n${menu}\n\n_Reply with the number._`);
    }
  }

  /** Tappable single-select list (good for "pick a collection"). */
  async sendList(phone: string, body: string, buttonText: string,
    rows: { id: string; title: string; description?: string }[]): Promise<void> {
    try {
      await getSock().sendMessage(toJid(phone), {
        text: body, footer: "Talli", title: "", buttonText,
        sections: [{ title: "Options", rows: rows.map((r) => ({
          rowId: r.id, title: r.title, description: r.description ?? "",
        })) }],
      });
    } catch (err) {
      logger.error(`[whatsapp] sendList failed: ${(err as Error).message}`);
    }
  }
}

export const whatsapp = new WhatsAppClient();
```

> The exact `buttons` shape depends on the fork; `itsliaaa/baileys` accepts the
> simplified `buttons: [{ text, id }]` form, vanilla Baileys uses the
> `buttonId/buttonText` form shown above. Pin the fork, match its README.

### 3. The message handler (the DM loop)

```ts
// integrations/whatsapp/handlers/message.handler.ts
import type { proto } from "baileys";
import prisma from "../../../prisma/index.js";
import { chatLinkService } from "../../../services/chat-link.service.js";
import { intentDispatcherService, type DispatchContext } from "../../../services/intent-dispatcher.service.js";
import { botCommandService } from "../../../services/bot-command.service.js";
import { platformUserService } from "../../../services/platform-user.service.js";
import { messages } from "../ui/messages.js";
import { whatsapp } from "../client.js";

/** Pull the phone, text, and any tapped button id out of a Baileys message. */
function parse(m: proto.IWebMessageInfo) {
  const phone = (m.key.remoteJid ?? "").replace("@s.whatsapp.net", "");
  const msg = m.message ?? {};
  const text =
    msg.conversation ??
    msg.extendedTextMessage?.text ??
    // a tapped button / list row comes back as a selection id = our action
    msg.buttonsResponseMessage?.selectedButtonId ??
    msg.listResponseMessage?.singleSelectReply?.selectedRowId ??
    "";
  const name = m.pushName ?? undefined;
  const tappedAction =
    msg.buttonsResponseMessage?.selectedButtonId ??
    msg.listResponseMessage?.singleSelectReply?.selectedRowId ??
    null;
  return { phone, text: text.trim(), name, tappedAction };
}

export async function handleWaMessage(m: proto.IWebMessageInfo): Promise<void> {
  const { phone, text, name, tappedAction } = parse(m);
  if (!phone || (!text && !tappedAction)) return;

  // a tapped button = the user's choice on a confirm/pay card → route like a callback
  if (tappedAction) return handleWaAction(phone, tappedAction);

  const linked = await chatLinkService.findActiveChat("whatsapp", phone);
  if (!linked) return void whatsapp.sendText(phone, messages.notLinked);

  const workspace = await prisma.workspace.findUnique({
    where: { id: linked.workspaceId },
    select: { name: true, ownerUserId: true },
  });
  if (!workspace) return void whatsapp.sendText(phone, messages.actionFailed);

  const identity = await platformUserService.upsert({
    platform: "whatsapp",
    platformUserId: phone,
    firstName: name,
  });

  const ctx: DispatchContext = {
    scope: "private",          // WhatsApp = DM only
    isGroupAdmin: true,
    platform: "whatsapp",
    workspaceId: linked.workspaceId,
    linkedChatId: linked.id,
    senderPlatformId: phone,
    ownerUserId: workspace.ownerUserId,
    workspaceName: workspace.name,
    senderName: platformUserService.formatName(identity),
  };

  const pending = await botCommandService.findPendingForReply(linked.id, phone, false);
  const result = pending
    ? await intentDispatcherService.continue(pending.id, text, ctx)
    : await intentDispatcherService.handleMessage(text, ctx);

  await whatsapp.sendButtons(phone, result.text, result.buttons ?? []);
}
```

Every `intentDispatcherService` / service call is **identical to Telegram**. Only
the transport (`whatsapp.*`) and the constant `scope: "private"` differ.

### 4. Start it at boot

Wire `startWhatsApp()` where the Telegram bot is initialized (server startup),
behind an env flag so it's opt-in:

```ts
// server bootstrap
if (env.WHATSAPP_ENABLED) await startWhatsApp();
```

No new env tokens needed for Baileys itself (auth is the QR session). Add one
flag:

```ts
// config/env.ts
WHATSAPP_ENABLED: z.coerce.boolean().default(false),
```

---

## Tradeoffs vs a hosted gateway

| | Baileys (self-host) | Hosted gateway (Wasender/Whapi) |
|---|---|---|
| Cost | Free | $6–29/mo |
| Buttons | ✅ via fork (best control) | ⚠️ gated/unstable |
| Setup | Run the socket + scan QR | API key + scan QR |
| Connection | Long-lived WebSocket in-process | Their infra → our webhook |
| Reliability | We own reconnects/session | They handle uptime |
| Session storage | We persist creds | They store it |
| Ban risk | Same (both are WhatsApp Web) | Same |

**For the hackathon:** Baileys (button-capable fork) is the strongest pick if we
want real tappable buttons and zero spend — at the cost of running and
babysitting the socket. If we'd rather not run infra, Whapi + polls (providers
doc) is the lower-effort route.

---

## Build order

1. `bun add baileys` (or the chosen fork) + `@hapi/boom`.
2. `baileys.ts` — connect, scan QR once, confirm `messages.upsert` fires.
3. `client.ts` `sendText` — round-trip a hardcoded reply.
4. Wire `handleWaMessage` → `intentDispatcherService` (text only first).
5. Neutralize buttons in the brain (`whatsapp-bot-plan.md` §2), then
   `sendButtons` with the fork; verify a tap returns the action id.
6. Connect flow: `wa.me/<botNumber>?text=connect <code>` → chat-link.
7. Move creds out of the local file into the DB before anything real.

### Sources
- [Baileys (WhiskeySockets)](https://github.com/WhiskeySockets/Baileys) · [Baileys docs](https://baileys.wiki/docs/intro/)
- [itsliaaa/baileys (interactive/buttons fork)](https://github.com/itsliaaa/baileys) · [@fizzxydev/baileys-pro](https://www.npmjs.com/package/@fizzxydev/baileys-pro)
- [Automating WhatsApp with Node.js and Baileys](https://medium.com/@elvisbrazil/automating-whatsapp-with-node-js-and-baileys-send-receive-and-broadcast-messages-with-code-0656c40bd928)
