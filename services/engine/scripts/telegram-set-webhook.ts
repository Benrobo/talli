import { bot } from "../src/integrations/telegram/index.js";
import env from "../src/config/env.js";

/**
 * Manage the Telegram webhook registration. The target base URL is chosen by a
 * `dev`/`prod` argument (Telegram requires https), so pointing the bot at an
 * environment is a one-liner and doesn't depend on which .env is loaded.
 *
 *   bun run scripts/telegram-set-webhook.ts set dev
 *   bun run scripts/telegram-set-webhook.ts set prod
 *   bun run scripts/telegram-set-webhook.ts info
 *   bun run scripts/telegram-set-webhook.ts delete
 *
 * Override a base per-env with TELEGRAM_WEBHOOK_BASE_DEV / _PROD if the hosts change.
 */

const ENV_BASES: Record<string, string> = {
  dev: process.env.TELEGRAM_WEBHOOK_BASE_DEV ?? "https://talli-dev-engine.benlabtest.space",
  prod: process.env.TELEGRAM_WEBHOOK_BASE_PROD ?? "https://talli-engine.benlabtest.space",
};

const command = process.argv[2] ?? "info";
const target = (process.argv[3] ?? "").toLowerCase();

/** Resolves the https base for the requested environment, or exits with guidance. */
function resolveBase(): string {
  if (!target) {
    throw new Error('Pass an environment: "dev" or "prod" (e.g. `set prod`)');
  }
  const base = ENV_BASES[target];
  if (!base) {
    throw new Error(`Unknown environment "${target}" — use "dev" or "prod"`);
  }
  if (!/^https:\/\//i.test(base)) {
    throw new Error(`Telegram requires an https webhook URL — "${base}" isn't https`);
  }
  return base.replace(/\/+$/, "");
}

async function set(): Promise<void> {
  const url = `${resolveBase()}/api/webhook/telegram`;

  await bot.api.deleteWebhook({ drop_pending_updates: true });
  console.log("🧹 cleared existing webhook + pending updates");

  await bot.api.setWebhook(url, {
    secret_token: env.TELEGRAM_WEBHOOK_SECRET,
    allowed_updates: ["message", "callback_query", "my_chat_member"],
  });
  console.log(`✅ webhook set (${target}) → ${url}`);

  await bot.api.setMyCommands([
    { command: "start", description: "Connect this chat with a code" },
    { command: "info", description: "About Talli, status, and commands" },
    { command: "balance", description: "Your wallet, savings, and collections (DM only)" },
    { command: "receipt", description: "Get a receipt for your latest payment (DM only)" },
    { command: "receipts", description: "List recent payments & pick a receipt (DM only)" },
    { command: "disconnect", description: "Unlink this chat (admin only in groups)" },
  ]);
  console.log("✅ command menu registered");
}

async function info(): Promise<void> {
  const me = await bot.api.getMe();
  const hook = await bot.api.getWebhookInfo();
  console.log(`bot: @${me.username} (${me.first_name})`);
  console.dir(hook, { depth: null });
}

async function remove(): Promise<void> {
  await bot.api.deleteWebhook();
  console.log("✅ webhook deleted");
}

const actions: Record<string, () => Promise<void>> = { set, info, delete: remove };

(actions[command] ?? info)()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error(err instanceof Error ? `❌ ${err.message}` : err);
    process.exit(1);
  });
