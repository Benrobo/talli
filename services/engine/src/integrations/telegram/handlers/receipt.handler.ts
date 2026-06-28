import prisma from "../../../prisma/index.js";
import { chatLinkService } from "../../../services/chat-link.service.js";
import { receiptService } from "../../../services/receipt/index.js";
import { telegram } from "../bot.js";
import { messages } from "../ui/messages.js";
import { receiptListKeyboard } from "../ui/keyboards.js";
import type { TalliContext } from "../types.js";
import { safeReply, isGroupChat } from "./shared.js";

async function resolveWorkspace(ctx: TalliContext) {
  const linked = await chatLinkService.findActiveChat("telegram", String(ctx.chat!.id));
  if (!linked) return null;
  const workspace = await prisma.workspace.findUnique({
    where: { id: linked.workspaceId },
    select: { ownerUserId: true },
  });
  if (!workspace) return null;
  return { workspaceId: linked.workspaceId, ownerUserId: workspace.ownerUserId };
}

export async function handleReceipt(ctx: TalliContext): Promise<void> {
  if (isGroupChat(ctx)) {
    await safeReply(ctx, messages.receiptDmOnly);
    return;
  }

  const ws = await resolveWorkspace(ctx);
  if (!ws) {
    await safeReply(ctx, messages.notLinked);
    return;
  }

  const arg = ctx.message?.text?.split(/\s+/).slice(1).join(" ").trim();
  const reference = arg || (await receiptService.latestReference(ws.workspaceId, ws.ownerUserId));
  if (!reference) {
    await safeReply(ctx, messages.noReceipts);
    return;
  }

  await sendReceipt(ctx, reference, ws.workspaceId);
}

export async function handleReceiptList(ctx: TalliContext): Promise<void> {
  if (isGroupChat(ctx)) {
    await safeReply(ctx, messages.receiptDmOnly);
    return;
  }

  const ws = await resolveWorkspace(ctx);
  if (!ws) {
    await safeReply(ctx, messages.notLinked);
    return;
  }

  const items = await receiptService.recentList(ws.workspaceId, ws.ownerUserId);
  if (items.length === 0) {
    await safeReply(ctx, messages.noReceipts);
    return;
  }

  await safeReply(ctx, messages.receiptList, receiptListKeyboard(items));
}

export async function handleReceiptCallback(ctx: TalliContext, reference: string): Promise<void> {
  const ws = await resolveWorkspace(ctx);
  if (!ws) return;
  await sendReceipt(ctx, reference, ws.workspaceId);
}

async function sendReceipt(ctx: TalliContext, reference: string, workspaceId: string): Promise<void> {
  try {
    const png = await receiptService.renderByReference(reference, workspaceId);
    await telegram.sendPhoto(String(ctx.chat!.id), png, messages.receiptCaption);
  } catch {
    await safeReply(ctx, messages.receiptNotFound(reference));
  }
}
