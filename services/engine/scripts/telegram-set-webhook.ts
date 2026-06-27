import { bot } from "../src/integrations/telegram/index.js";
import env from "../src/config/env.js";

/**
 * Manage the Telegram webhook registration. URL is built from PUBLIC_API_URL,
 * so switching environments is just re-running this.
 *
 *   bun run scripts/telegram-set-webhook.ts set | info | delete
 */

const command = process.argv[2] ?? "info";

async function set(): Promise<void> {
  if (!env.PUBLIC_API_URL) {
    throw new Error("PUBLIC_API_URL is not set — needed to build the webhook URL");
  }
  const url = `${env.PUBLIC_API_URL}/api/webhook/telegram`;

  await bot.api.deleteWebhook({ drop_pending_updates: true });
  console.log("🧹 cleared existing webhook + pending updates");

  await bot.api.setWebhook(url, {
    secret_token: env.TELEGRAM_WEBHOOK_SECRET,
    allowed_updates: ["message", "callback_query", "my_chat_member"],
  });
  console.log(`✅ webhook set → ${url}`);

  await bot.api.setMyCommands([
    { command: "start", description: "Connect this chat with a code" },
    { command: "info", description: "About Talli, status, and commands" },
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
    console.error(err);
    process.exit(1);
  });
