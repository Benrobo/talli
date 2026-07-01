# Baileys WhatsApp bot — setup, the user flow, and running it in production

> Companion to [`whatsapp-baileys-plan.md`](./whatsapp-baileys-plan.md) (the
> code). **This doc is the operational story**, in plain terms:
> 1. How this becomes an actual "bot account" (there's no app store — it's a
>    phone number).
> 2. How a real user discovers and starts using it.
> 3. How we deploy and keep it alive in production (the hard part — Baileys is a
>    persistent connection, not a normal API).

---

## 1. What "a Baileys bot account" actually is

There is **no bot account** on WhatsApp like Telegram's @BotFather bots. With
Baileys, **the bot _is_ a real WhatsApp account on a real phone number.** We log
into that account programmatically (by scanning its QR with our server, the same
way WhatsApp Web logs in), and from then on our code reads/sends as that number.

So "making the bot" = **getting a phone number, putting WhatsApp on it, and
linking our server to it as a companion device.**

```
A phone number  →  WhatsApp installed on it  →  our server scans its QR
                                              →  server is now a "linked device"
                                              →  server sends/receives as that number
```

### Choosing the number (important)

| Option | Good for | Risk |
|---|---|---|
| **A spare SIM / cheap second phone** | Hackathon demo | If banned, you lose that number only |
| **A virtual number** (e.g. Google Voice, a VoIP SIM) | Quick start | Some VoIP numbers can't receive WhatsApp OTP |
| **WhatsApp Business app number** | Slightly more headroom + a business profile | Still unofficial via Baileys; still bannable |
| **The official Cloud API number** | Real production | Not Baileys — that's the migration path |

For the hackathon: a **burner number on a spare phone** (or WhatsApp Business
app on it). Treat it as disposable. Don't use anyone's personal number — a ban
is permanent for that number.

> ⚠️ Baileys is unofficial and against WhatsApp ToS. Bans happen, especially with
> cold outbound messaging. This is fine for a demo; for real users you migrate to
> the official Cloud API (the platform layer swaps, the brain doesn't).

---

## 2. The end-user flow (how someone actually uses it)

A WhatsApp bot can't be "searched" or "installed." Users reach it by **messaging
its number first.** Two patterns, both supported:

### A. User starts the chat (the normal path)

This mirrors Telegram's `/start <code>` connect flow we already have.

```
1. In the Talli web app, the owner clicks "Connect WhatsApp".
2. We generate a one-time link code (chatLinkService.issueCode), same as Telegram.
3. We show a button / link:
       https://wa.me/<BOT_NUMBER>?text=connect%20<code>
4. User taps it → WhatsApp opens a chat with the bot, message pre-filled:
       "connect 7F3K9Q"
5. User hits send.
6. Bot receives it (messages.upsert), reads the code, calls
   chatLinkService.linkChat("whatsapp", phone, code) → workspace linked.
7. Bot replies "✅ Connected to <workspace>. Try: 'split 30k 3 ways'."
```

`wa.me/<number>?text=...` is WhatsApp's official deep link — it works from web,
mobile, anywhere, and **the user does not need to save the bot as a contact.**
A QR code that encodes that same link works for posters/print.

### B. Bot starts the chat (outbound — use sparingly)

We can DM any number directly via its JID (`<number>@s.whatsapp.net`), no contact
saved — e.g. "Someone just paid your collection 🎉". But:

- **Only message people who opted in** (connected, or paid into a collection).
  Cold-messaging strangers is the #1 way to get the number banned.
- WhatsApp has no strict "24-hour window" on Baileys like the official API, but
  behaving like a human (replying to users, not blasting) keeps the number alive.

### What the user experiences

Identical to the Telegram DM experience, because it's the same brain:

```
User:  split 30k between me, Tolu and Ada
Bot:   Here's the split:  (confirm card with Confirm / Cancel)
User:  (taps Confirm — or replies "1" if buttons don't render)
Bot:   ✅ Done. Sent pay links to each person.
```

---

## 3. The production problem: Baileys is a *stateful, always-on* connection

This is the crux and the part that's different from everything else in the
engine. A normal API route is **stateless** — any server instance can handle any
request. Baileys is the opposite:

- It holds a **single live WebSocket** to WhatsApp for the bot number.
- That connection **is** the login session. If the process dies, the socket drops
  and must reconnect using saved credentials.
- **Only one process may hold the session at a time.** Two instances using the
  same credentials = WhatsApp logs one (or both) out → bot goes down.

Three consequences shape the deployment:

### 3a. Run it as ONE long-lived process (a worker), not serverless

- **Cannot** run on Vercel/Lambda/Cloudflare Workers — those are stateless and
  short-lived; the socket would die between requests.
- **Must** run on something that keeps a process alive 24/7: a small VM or a
  container host (Fly.io, Railway, Render "Background Worker", a $5 VPS, etc.).
- Our engine already boots a persistent process with a WebSocket server
  (`startSocketServer`) and scheduler (`startScheduler`) in
  [server.ts](../services/engine/src/server.ts) — so the Baileys socket starts in
  the same place (`startWhatsApp()` next to those). It fits the existing model.

> If the engine is ever scaled to **multiple instances**, the Baileys socket must
> run on **exactly one** of them (a dedicated "whatsapp worker" instance, or a
> leader-election lock). The web/API instances stay stateless. For the hackathon:
> one instance, no problem.

### 3b. Persist the session OUTSIDE the container's local disk

The QR scan creates credentials. If you store them in a local file
(`useMultiFileAuthState("./.wa-auth")`) and the container restarts onto fresh
disk (most PaaS deploys do), **the session is lost and you must re-scan the QR** —
which you can't do unattended in production.

Fix: store the Baileys auth state in **durable shared storage we already have**:

- **Redis** (already wired — [lib/redis.js](../services/engine/src/lib/redis.js))
  — fast, perfect for the small creds blob. Recommended.
- **Cloudflare R2** (already wired — [config/r2.ts](../services/engine/src/config/r2.ts))
  — also fine.
- **Postgres** — a single `wa_auth` row/table via Prisma.

Implement a custom auth-state adapter (Baileys docs explicitly say
`useMultiFileAuthState` is demo-grade and to write your own for prod) that
read/writes the creds + signal keys to Redis. Then any restart reconnects
**without** a new QR.

```
QR scanned once ──► creds saved to Redis ──► container restart ──►
   load creds from Redis ──► reconnect silently (no QR)
```

### 3c. Reconnect, health, and re-link

- **Auto-reconnect** on `connection.close` unless `DisconnectReason.loggedOut`
  (already in the plan-doc code). On `loggedOut`, the session is dead — someone
  must re-scan; alert yourself (log + a ping) when that happens.
- **Health:** expose the socket's connection state on the existing
  `/health` route (e.g. `whatsapp: "open" | "connecting" | "closed"`) so you can
  see at a glance if the bot is linked.
- **First-time link in prod:** since you can't scan a terminal QR on a remote box,
  either (a) temporarily log the QR as a data-URL / render it on a one-off admin
  page and scan from your phone, or (b) generate the session locally once and seed
  the creds into Redis. Do this once; afterwards it self-heals.

---

## 4. Putting it together — the production picture

```
                    ┌───────────────────────────────────────────┐
   WhatsApp  ◄──────► Talli engine (ONE always-on worker)        │
   (bot number)      │                                           │
                     │  • Baileys socket  (startWhatsApp)         │
                     │  • Hono API + webhooks                     │
                     │  • Socket.io server                       │
                     │  • scheduler / trigger.dev tasks          │
                     │        │                                  │
                     │        ▼                                  │
                     │  intent-dispatcher → services (the brain) │
                     └─────────┬─────────────────────┬───────────┘
                               │                     │
                         ┌─────▼─────┐         ┌─────▼─────┐
                         │  Postgres │         │   Redis   │
                         │ (data)    │         │ • app state│
                         └───────────┘         │ • WA creds │
                                               └───────────┘
```

- The bot number's WhatsApp ↔ our worker (Baileys WebSocket).
- Auth credentials live in Redis → survive restarts, no re-scan.
- Everything below the socket is the same engine + brain we already run.

### Deployment checklist

- [ ] Pick a **host that keeps a process alive 24/7** (VM / container worker — not serverless).
- [ ] Run the Baileys socket on **one** instance only.
- [ ] Store **auth creds in Redis/R2/Postgres**, never local disk.
- [ ] **Seed the session once** (scan QR via admin page or local-then-upload).
- [ ] **Auto-reconnect** on drop; **alert** on `loggedOut`.
- [ ] Add **`whatsapp` status to `/health`**.
- [ ] Use a **burner number**; keep outbound limited to opted-in users.
- [ ] Graceful shutdown: close the socket cleanly on SIGTERM (we already handle SIGTERM).

---

## 5. Production lifecycle (start → run → recover)

```
DEPLOY
  └─ engine boots → startWhatsApp()
       ├─ creds in Redis?  ── yes ─► connect silently ─► "open" ✅ bot live
       │                    └─ no  ─► print/serve QR ─► you scan once ─► creds saved
       │
RUNNING
  ├─ user messages bot ─► messages.upsert ─► brain ─► reply
  ├─ connection drops  ─► auto-reconnect from Redis creds ─► back to "open"
  └─ /health shows whatsapp: "open"
RECOVERY
  ├─ container restart ─► reload creds from Redis ─► reconnect (no QR) ✅
  └─ DisconnectReason.loggedOut ─► session dead ─► alert ─► re-scan QR once
```

---

## 6. Honest summary

- **The "bot account" is just a phone number** running WhatsApp, with our server
  linked to it as a companion device. No marketplace, no @handle.
- **Users reach it** by tapping a `wa.me/<number>?text=connect <code>` link (the
  WhatsApp twin of Telegram's `/start <code>`); no need to save a contact.
- **Production = one always-on worker** (not serverless) holding a single live
  socket, with **auth creds in Redis** so restarts reconnect without re-scanning.
  Our engine already runs as exactly this kind of persistent process, so Baileys
  slots in beside the existing socket server + scheduler.
- **It will get banned eventually** on a burner — fine for the hackathon; the
  real-production answer is migrating this same platform layer to the official
  Cloud API later (brain unchanged).

### Sources
- [Baileys](https://github.com/WhiskeySockets/Baileys) · [Baileys docs — auth state](https://baileys.wiki/docs/intro/)
- [WhatsApp click-to-chat (wa.me) links](https://faq.whatsapp.com/5913398998672934)
