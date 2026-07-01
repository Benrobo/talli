# WhatsApp gateway alternatives — which ones support buttons

> Companion to [`whatsapp-bot-plan.md`](./whatsapp-bot-plan.md). That doc covers
> the architecture and uses WasenderAPI as the example provider. **This doc is the
> provider shortlist**, filtered on one hard requirement: **can it send tappable
> interactive buttons** (so the Confirm/Cancel and Pay UX from Telegram carries
> over, instead of "reply 1 / reply 2" text menus)?

---

## ⚠️ The thing you must know before choosing

**WhatsApp restricted native interactive buttons to the *official* Meta Cloud
API.** Around 2023 Meta stopped honoring tappable reply-buttons / list messages
sent from unofficial, WhatsApp-Web-based clients. So across the unofficial
gateways:

- Button endpoints often still *exist* in their docs, but are **deprecated,
  unstable, or return errors** (e.g. GREEN-API's `SendButtons` now returns a
  `403`; Whapi labels buttons "not stable"; WAHA's button support varies by
  engine).
- Whether a button renders as tappable depends on the **recipient's WhatsApp
  version** and Meta's server-side gating — i.e. not reliable.

> Quote (Whapi): *"this feature is not available to every user, but only for
> WhatsApp business accounts that work via Meta Cloud API."* Their recommended
> replacement is **polls**.

**What this means for us:** if **reliable tappable buttons** are non-negotiable,
the only solid answer is the **official Cloud API** (blocked on the Meta account
issue). On unofficial gateways, the realistic "clickable choice" options, best
first, are:

1. **Polls** — works on every unofficial gateway, tappable, looks clean. Best
   button substitute for Confirm/Cancel and short choices.
2. **List messages** — a tappable menu; support is patchy but better than buttons.
3. **Numbered text** ("reply 1 to confirm") — always works, ugly.

Our `DispatchButton[]` abstraction (see `whatsapp-bot-plan.md` §2) renders to
**whichever** of these a given provider supports — so the brain doesn't change if
we switch providers or fall back from buttons → polls → text.

---

## The shortlist (all unofficial, QR-linked, REST + webhook)

| Provider | Buttons | Polls | Lists | Hosting | Price | Notes |
|---|---|---|---|---|---|---|
| **Whapi.cloud** | ⚠️ "not stable" | ✅ | ✅ | Hosted | $29/mo (5-day free trial; free sandbox) | Best-documented; explicitly recommends polls over buttons |
| **GREEN-API** | ❌ `SendButtons` 403; `SendInteractiveButtons` newer | ✅ | ✅ | Hosted | Free dev tier; paid plans | Has a dedicated interactive-buttons method but native buttons gated by Meta |
| **WAHA** | ⚠️ engine-dependent | ✅ | ✅ | **Self-host** | Free (core); $5/mo Patreon for Plus | Open-source, 3 engines (WEBJS/NOWEB/GOWS); most control |
| **Evolution API** | ⚠️ Baileys-based | ✅ | ✅ | **Self-host** | Free (open-source) | Baileys under the hood; popular, big community |
| **WasenderAPI** | ❌ none | ✅ | ❌ | Hosted | $6/mo | Cheapest; text + media + polls only (current pick in the plan doc) |

(✅ = documented & working, ⚠️ = exists but unreliable/gated, ❌ = not available)

---

## Recommendation for the hackathon

**Use Whapi.cloud, and render our buttons as polls.**

Reasoning:
- It's the best-documented hosted gateway, has a **free 5-day trial + a free
  sandbox**, and supports **polls + lists** reliably (the working substitutes).
- It *also* exposes a real `/messages/interactive` button endpoint — so if a
  given demo phone happens to render buttons, we get them; if not, we fall back
  to polls. Same code path via our adapter.
- Hosted = no infra to run during a hackathon.

**If you specifically want to try for real tappable buttons** and don't mind
running a container: **WAHA** (self-hosted) gives the most control and its NOWEB
engine has the widest message-type support — but it's more setup and buttons are
still ultimately at Meta's mercy.

**If buttons turn out to be flaky on every provider** (likely), **polls are the
answer** and every provider above supports them. Functionally identical UX for
the user: they tap a choice.

---

## Concrete payloads (for whichever we pick)

### Whapi.cloud

**Send interactive buttons** (try first; may fall back to poll):
```
POST https://gate.whapi.cloud/messages/interactive
Authorization: Bearer <TOKEN>
Content-Type: application/json
```
```json
{
  "to": "2348012345678",
  "type": "button",
  "body": { "text": "Confirm this split of ₦30,000 three ways?" },
  "action": {
    "buttons": [
      { "type": "quick_reply", "title": "Confirm", "id": "confirm:CMD123" },
      { "type": "quick_reply", "title": "Cancel",  "id": "cancel:CMD123" }
    ]
  }
}
```
- Up to **3** buttons. On tap, the webhook delivers both the button **id**
  (our `action`) and its title.

**Send a poll** (reliable button substitute):
```
POST https://gate.whapi.cloud/messages/poll
```
```json
{
  "to": "2348012345678",
  "title": "Confirm this split of ₦30,000 three ways?",
  "options": ["✅ Confirm", "❌ Cancel"],
  "count": 1
}
```
- 2–12 options; the webhook tells you which option the user picked → map back to
  the action.

### GREEN-API (interactive buttons method)
```
POST {{apiUrl}}/waInstance{{id}}/sendInteractiveButtons/{{token}}
```
- `SendButtons` (old) is dead (403). `SendInteractiveButtons` is the current one,
  still subject to Meta gating. Polls (`sendPoll`) are the safe path.

### WAHA (self-hosted)
```
POST http://localhost:3000/api/sendButtons      # engine-dependent
POST http://localhost:3000/api/sendPoll          # reliable
```
- Free, runs as a Docker container; pick the **NOWEB** engine for best
  message-type coverage.

---

## How this plugs into our code (no brain changes)

The platform layer's `WhatsAppClient.sendButtons(to, body, buttons)` (see
`whatsapp-bot-plan.md` §6c) becomes a **render strategy** chosen per provider:

```ts
// integrations/whatsapp/client.ts  (provider-agnostic surface)
async sendButtons(to: string, body: string, buttons: DispatchButton[]) {
  const taps = buttons.filter((b) => b.kind === "callback");
  if (taps.length === 0) return this.sendText(to, body);

  // Strategy per provider, best-effort → graceful fallback:
  //   1. try native interactive buttons (Whapi /messages/interactive)
  //   2. else send a poll  (options = button labels, ids tracked)
  //   3. else numbered text ("reply 1 to confirm")
  // The inbound handler maps the chosen id/option/number back to the action.
  return this.renderChoices(to, body, taps);
}
```

Because the **brain** only ever produces neutral `DispatchButton[]`, switching
Whapi ↔ WAHA ↔ Wasender ↔ official Cloud API is a one-file change. We can even
decide the strategy at runtime from an env flag (`WA_PROVIDER=whapi|waha|...`).

---

## Bottom line

- **Reliable tappable buttons = official Cloud API only.** Unofficial gateways
  lost native buttons; their docs' button endpoints are mostly deprecated/gated.
- **For the hackathon on an unofficial gateway, use polls** as the button
  substitute — same tap-a-choice UX, works everywhere.
- **Whapi.cloud** is the best hosted pick (polls + lists + a button endpoint to
  try, free trial). **WAHA** if you want self-hosted control.
- Our architecture renders `DispatchButton[]` → buttons | poll | text per
  provider, so none of this touches the dispatcher or services.

### Sources
- [Whapi.cloud](https://whapi.cloud/) · [Whapi interactive docs](https://whapi.readme.io/reference/sendmessageinteractive) · [Whapi buttons help](https://support.whapi.cloud/help-desk/sending/send-message-with-buttons) · [Whapi: replacing buttons with polls](https://medium.com/@whapicloud/replacing-interactive-buttons-in-whatsapp-api-914eb1748624)
- [GREEN-API SendButtons](https://green-api.com/en/docs/api/sending/SendButtons/)
- [WAHA (GitHub)](https://github.com/devlikeapro/waha) · [WAHA send messages](https://waha.devlike.pro/docs/how-to/send-messages/)
- [Evolution API overview](https://gurusup.com/blog/evolution-api-whatsapp)
- [Official Cloud API interactive buttons](https://developers.facebook.com/docs/whatsapp/cloud-api/messages/interactive-reply-buttons-messages/)
