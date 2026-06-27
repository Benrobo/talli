import { bot, telegram } from "../src/integrations/telegram/index.js";
import { chatLinkService } from "../src/services/chat-link.service.js";
import prisma from "../src/prisma/index.js";

/**
 * Smoke-tests the Telegram stack without a public tunnel: verifies the token,
 * then runs the full chat-link loop (issue → link → replay → gate) against the
 * DB. Pass a chat id to also send a real message.
 *
 *   bun run scripts/telegram-smoke.ts [chatId]
 */

const sendToChatId = process.argv[2];

async function main(): Promise<void> {
  console.log("Telegram smoke test\n");

  await bot.init();
  console.log(`✅ bot: @${bot.botInfo.username} (${bot.botInfo.first_name})`);

  const workspace = await prisma.workspace.findFirst({ select: { id: true, ownerUserId: true } });
  if (!workspace) {
    console.error("No workspace in DB — sign up via the dashboard first.");
    process.exit(1);
  }

  console.log("\n--- chat-link loop ---");
  const issued = await chatLinkService.issueCode(
    workspace.id,
    workspace.ownerUserId,
    "telegram",
    "private_link"
  );
  console.log(`issued code: ${issued.code}`);
  console.log(`deep link:   ${issued.deepLink}`);

  const fakeChatId = `smoke-${issued.code}`;
  const linkResult = await chatLinkService.linkChat(issued.code, {
    platform: "telegram",
    platformChatId: fakeChatId,
    platformUserId: "999999",
    title: "Smoke Test",
  });
  console.log(`link result: ${linkResult.ok ? "linked ✅" : `failed (${linkResult.reason})`}`);

  const replay = await chatLinkService.linkChat(issued.code, {
    platform: "telegram",
    platformChatId: fakeChatId,
    platformUserId: "999999",
  });
  console.log(`replay (should fail): ${replay.ok ? "LINKED ⚠️ (code reused!)" : "rejected ✅"}`);

  const gate = await chatLinkService.findActiveChat("telegram", fakeChatId);
  console.log(`gate lookup: ${gate ? "found ✅" : "not found ⚠️"}`);

  await prisma.linkedChat.deleteMany({ where: { platformChatId: fakeChatId } });
  console.log("cleaned up fake chat");

  if (sendToChatId) {
    console.log("\n--- live send ---");
    await telegram.sendMessage(sendToChatId, "🧪 *Talli smoke test* — if you see this, sending works.");
    console.log(`sent a message to chat ${sendToChatId}`);
  }

  console.log("\nDone.");
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });
