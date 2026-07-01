# Talli

AI treasurer and savings assistant for WhatsApp and Telegram. Collect money,
track payments, run savings jars, and manage group contributions from chat.

**Hackathon stack:** Bun + Turborepo · Hono engine · Vite SPA · Prisma +
Postgres · Nomba Checkout · Telegram / WhatsApp bots.

Full product spec: [`docs/talli-prd.md`](docs/talli-prd.md)  
Task tracker: [`docs/todos.md`](docs/todos.md)

## Quick start

```bash
bun install

cp .env.example .env
cp services/engine/.env.example services/engine/.env

bun db:migrate
bun dev
```

First run only — start the portless HTTPS proxy once (sudo for port 443):

```bash
sudo portless proxy start --https
```

### Local URLs

| Service | URL |
|---|---|
| Web app | **https://talli.localhost** (portless) |
| Engine API | http://localhost:7291 |
| Marketing | http://localhost:7195 |

Web dev runs through [portless](https://www.npmjs.com/package/portless) — same
pattern as mood-world. Set `WEB_APP_URL=https://talli.localhost` in
`services/engine/.env` so CORS and auth cookies match.

Leave `VITE_ENGINE_API_URL` empty — the Vite dev server proxies `/api` to the
engine on `:7291`.

Bypass portless: `bun dev:web:no-proxy` → http://localhost:7193

### Cloudflare tunnel (engine / webhooks only)

Only the engine is tunneled for Nomba, Telegram, and WhatsApp webhooks:

| Hostname | Local target |
|---|---|
| https://p7291.benlabtest.space | Engine `:7291` |

```bash
bun tunnel:push
cloudflared tunnel run my-tunnel
```

```env
PUBLIC_API_URL=https://p7291.benlabtest.space
```

## External setup

| Service | Docs |
|---|---|
| Nomba | [`docs/nomba-test-credentials.md`](docs/nomba-test-credentials.md) · [Nomba API](https://developer.nomba.com) |
| Telegram | Create bot via [@BotFather](https://t.me/BotFather) |
| WhatsApp | Meta Business Cloud API (private chat only for MVP) |

## Scripts

```bash
bun dev                  # engine + web (portless) + marketing
bun dev:engine           # engine only
bun dev:web              # web via portless → https://talli.localhost
bun dev:web:no-proxy     # web on http://localhost:7193
bun db:migrate
bun tunnel:push
```

Agent instructions: [`AGENTS.md`](AGENTS.md)
