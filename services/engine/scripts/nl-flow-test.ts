import prisma from "../src/prisma/index.js";
import { intentDispatcherService, type DispatchContext } from "../src/services/intent-dispatcher.service.js";
import { botCommandService } from "../src/services/bot-command.service.js";

const USER = "nl_test_user";
const OTHER = "nl_test_intruder";

async function main() {
  const ws = await prisma.workspace.findFirst({ select: { id: true, ownerUserId: true, name: true } });
  if (!ws) throw new Error("no workspace");
  const chat = await prisma.linkedChat.findFirst({ where: { platform: "telegram", status: "active" } });
  if (!chat) throw new Error("no linked chat — connect one first");

  await prisma.botCommand.deleteMany({ where: { senderPlatformId: { in: [USER, OTHER] } } });

  const ctx: DispatchContext = {
    scope: "group",
    workspaceId: ws.id,
    linkedChatId: chat.id,
    platform: "telegram",
    senderPlatformId: USER,
    ownerUserId: ws.ownerUserId,
    workspaceName: ws.name,
    senderName: "Tester",
  };

  console.log(`\n=== 1. group, clear: "create a collection for jerseys at 5000 each" ===`);
  const plan = await intentDispatcherService.handleMessage("create a collection for jerseys at 5000 each", ctx);
  console.log("bot replies:\n" + plan.text);
  console.log("confirm keyboard:", plan.keyboard ? "✅" : "⚠️ none", "| clarify:", plan.clarify ? "⚠️ unexpected" : "✅ none");

  console.log(`\n=== 2. group, vague: "@bot collect from everyone" → should ask (clarify) ===`);
  const vague = await intentDispatcherService.handleMessage("collect from everyone", ctx);
  console.log("bot asks:\n" + vague.text);
  console.log("clarify signal:", vague.clarify ? `✅ commandId=${vague.clarify.commandId}` : "⚠️ MISSING");

  if (vague.clarify) {
    const clarifyMsgId = 9001;
    await botCommandService.setClarifyMessageId(vague.clarify.commandId, clarifyMsgId);

    console.log(`\n=== 3. group reply-match: wrong replyTo id → no pending found ===`);
    const noMatch = await botCommandService.findPendingForReply(chat.id, USER, true, 9999);
    console.log("found:", noMatch ? "⚠️ should be null" : "✅ null (no match)");

    console.log(`\n=== 4. group reply-match: right id but WRONG sender → no pending ===`);
    const wrongSender = await botCommandService.findPendingForReply(chat.id, OTHER, true, clarifyMsgId);
    console.log("found:", wrongSender ? "⚠️ should be null" : "✅ null (sender gate)");

    console.log(`\n=== 5. group reply-match: right id + right sender → found ===`);
    const matched = await botCommandService.findPendingForReply(chat.id, USER, true, clarifyMsgId);
    console.log("found:", matched ? `✅ ${matched.id}` : "⚠️ MISSING");

    if (matched) {
      console.log(`\n=== 6. continue with "5000" → should complete to a confirm card ===`);
      const cont = await intentDispatcherService.continue(matched.id, "5000 each", ctx);
      console.log("bot replies:\n" + cont.text);
      console.log("confirm keyboard:", cont.keyboard ? "✅" : (cont.clarify ? "↩️ asked again" : "⚠️ none"));
    }
  }

  console.log(`\n=== 7. DM next-message: ask-back then plain reply ===`);
  const dmCtx: DispatchContext = { ...ctx, scope: "private", senderPlatformId: USER };
  await prisma.botCommand.deleteMany({ where: { senderPlatformId: USER } });
  const dmAsk = await intentDispatcherService.handleMessage("send some money", dmCtx);
  console.log("bot asks:\n" + dmAsk.text, "| clarify:", dmAsk.clarify ? "✅" : "⚠️");
  const dmPending = await botCommandService.findPendingForReply(chat.id, USER, false);
  console.log("DM pending (no replyTo needed):", dmPending ? "✅ found" : "⚠️ MISSING");

  console.log(`\n=== 8. initiator gate: only the asker matches their own pending ===`);
  const intruderPending = await botCommandService.findPendingForReply(chat.id, OTHER, false);
  console.log("intruder finds USER's DM pending:", intruderPending ? "⚠️ leak" : "✅ isolated");

  await prisma.botCommand.deleteMany({ where: { senderPlatformId: { in: [USER, OTHER] } } });
  const jersey = await prisma.collection.findFirst({
    where: { workspaceId: ws.id, title: { contains: "jersey", mode: "insensitive" } },
    orderBy: { createdAt: "desc" },
  });
  if (jersey) await prisma.collection.delete({ where: { id: jersey.id } }).catch(() => {});
  console.log("\ncleaned up ✅");
  process.exit(0);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
