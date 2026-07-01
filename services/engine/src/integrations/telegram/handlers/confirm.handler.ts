import prisma from "../../../prisma/index.js";
import { chatLinkService } from "../../../services/chat-link.service.js";
import { intentDispatcherService } from "../../../services/intent-dispatcher.service.js";
import { botCommandService } from "../../../services/bot-command.service.js";
import { platformUserService } from "../../../services/platform-user.service.js";
import { messages } from "../ui/messages.js";
import type { Intent } from "../../../schemas/intent.schema.js";
import { isAdminOnlyInGroup } from "../../../constants/chat-capabilities.js";
import type { TalliContext } from "../types.js";
import { safeReply, isGroupChat, isSenderAdmin } from "./shared.js";

/** Confirm / Cancel taps on an intent's parse-and-confirm card. */
export async function handleConfirm(
  ctx: TalliContext,
  commandId: string,
  decision: "confirm" | "cancel"
): Promise<void> {
  const command = await botCommandService.get(commandId);
  if (command && command.senderPlatformId !== String(ctx.from!.id)) {
    await ctx.answerCallbackQuery().catch(() => {});
    return;
  }

  if (decision === "cancel") {
    const result = await intentDispatcherService.cancel(commandId);
    await safeReply(ctx, result.text);
    return;
  }

  const intent = command ? (command.parsedIntent as Intent | null) : null;
  if (intent && isGroupChat(ctx) && isAdminOnlyInGroup(intent.intent) && !(await isSenderAdmin(ctx))) {
    await ctx.answerCallbackQuery({ text: "Only a group admin can do this." }).catch(() => {});
    return;
  }

  const linked = await chatLinkService.findActiveChat("telegram", String(ctx.chat!.id));
  const workspace = linked
    ? await prisma.workspace.findUnique({
        where: { id: linked.workspaceId },
        select: { name: true, ownerUserId: true },
      })
    : null;
  if (!linked || !workspace) {
    await safeReply(ctx, messages.actionFailed);
    return;
  }

  const identity = await platformUserService.upsert({
    platform: "telegram",
    platformUserId: String(ctx.from!.id),
    firstName: ctx.from?.first_name,
    username: ctx.from?.username,
  });

  const result = await intentDispatcherService.confirm(commandId, {
    scope: isGroupChat(ctx) ? "group" : "private",
    workspaceId: linked.workspaceId,
    linkedChatId: linked.id,
    platform: "telegram",
    senderPlatformId: String(ctx.from!.id),
    ownerUserId: workspace.ownerUserId,
    workspaceName: workspace.name,
    senderName: platformUserService.formatName(identity),
    isGroupAdmin: true,
  });

  if (result.checkoutUrl) {
    await ctx.answerCallbackQuery({ url: result.checkoutUrl }).catch(() => {});
  }
  await safeReply(ctx, result.text, result.keyboard);
}
