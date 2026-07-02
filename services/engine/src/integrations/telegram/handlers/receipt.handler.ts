import { chatLinkService } from "../../../services/chat-link.service.js";
import { receiptService } from "../../../services/receipt/index.js";
import { telegram } from "../bot.js";
import { messages } from "../ui/messages.js";
import { receiptListKeyboard } from "../ui/keyboards.js";
import type { TalliContext } from "../types.js";
import { safeReply, isGroupChat } from "./shared.js";

async function resolveOwner(ctx: TalliContext): Promise<{ userId: string } | null> {
  const linked = await chatLinkService.findActiveChat("telegram", String(ctx.chat!.id));
  if (!linked) return null;
  return { userId: linked.userId };
}

export async function handleReceipt(ctx: TalliContext): Promise<void> {
  if (isGroupChat(ctx)) {
    await safeReply(ctx, messages.receiptDmOnly);
    return;
  }

  const owner = await resolveOwner(ctx);
  if (!owner) {
    await safeReply(ctx, messages.notLinked);
    return;
  }

  const arg = ctx.message?.text?.split(/\s+/).slice(1).join(" ").trim();
  const reference = arg || (await receiptService.latestReference(owner.userId));
  if (!reference) {
    await safeReply(ctx, messages.noReceipts);
    return;
  }

  await sendReceipt(ctx, reference, owner.userId);
}

export async function handleReceiptList(ctx: TalliContext): Promise<void> {
  if (isGroupChat(ctx)) {
    await safeReply(ctx, messages.receiptDmOnly);
    return;
  }

  const owner = await resolveOwner(ctx);
  if (!owner) {
    await safeReply(ctx, messages.notLinked);
    return;
  }

  const items = await receiptService.recentList(owner.userId);
  if (items.length === 0) {
    await safeReply(ctx, messages.noReceipts);
    return;
  }

  await safeReply(ctx, messages.receiptList, receiptListKeyboard(items));
}

export async function handleReceiptCallback(ctx: TalliContext, reference: string): Promise<void> {
  const owner = await resolveOwner(ctx);
  if (!owner) return;
  await sendReceipt(ctx, reference, owner.userId);
}

async function sendReceipt(ctx: TalliContext, reference: string, userId: string): Promise<void> {
  try {
    const png = await receiptService.renderByReference(reference, userId);
    await telegram.sendPhoto(String(ctx.chat!.id), png, messages.receiptCaption);
  } catch {
    await safeReply(ctx, messages.receiptNotFound(reference));
  }
}
