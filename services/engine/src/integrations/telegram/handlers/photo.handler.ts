import env from "../../../config/env.js";
import logger from "../../../lib/logger.js";
import { billParserService } from "../../../services/bill-parser.service.js";
import { intentDispatcherService } from "../../../services/intent-dispatcher.service.js";
import { messages } from "../ui/messages.js";
import type { TalliContext } from "../types.js";
import { safeReply, isGroupChat, resolveDispatchContext } from "./shared.js";

const MENTION = new RegExp(`@${env.TELEGRAM_BOT_USERNAME}`, "gi");

/**
 * A photo of a bill. Downloads it, reads the total with vision, then feeds that
 * total plus the caption ("split this between Tolu and Ada") into the normal
 * split flow — so the user gets the usual confirm card with the extracted amount
 * to correct before anything is created. In a group the bot only acts when
 * mentioned in the caption; in a DM every photo is treated as a bill.
 */
export async function handlePhoto(ctx: TalliContext): Promise<void> {
  const caption = ctx.message?.caption ?? "";
  if (isGroupChat(ctx) && !caption.match(MENTION)) return;

  const dispatchCtx = await resolveDispatchContext(ctx);
  if (!dispatchCtx) {
    await safeReply(ctx, isGroupChat(ctx) ? messages.groupNotLinked : messages.notLinked);
    return;
  }

  const file = await ctx.getFile().catch(() => null);
  if (!file?.file_path) {
    await safeReply(ctx, messages.billUnreadable);
    return;
  }

  await safeReply(ctx, messages.billReading);

  const image = await downloadFile(file.file_path).catch((err) => {
    logger.warn(`[photo] download failed: ${(err as Error).message}`);
    return null;
  });
  if (!image) {
    await safeReply(ctx, messages.billUnreadable);
    return;
  }

  const bill = await billParserService.parse(image);
  if (!bill.total || !bill.confident) {
    await safeReply(ctx, messages.billRejected(bill.reason));
    return;
  }

  const instruction = caption.replace(MENTION, "").trim();
  const command = instruction
    ? `${instruction} (the bill total is ${bill.total})`
    : `split ${bill.total}`;
  const result = await intentDispatcherService.handleMessage(command, dispatchCtx);
  await safeReply(ctx, result.text, result.keyboard);
}

async function downloadFile(filePath: string): Promise<Buffer> {
  const url = `https://api.telegram.org/file/bot${env.TELEGRAM_BOT_TOKEN}/${filePath}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`file fetch ${res.status}`);
  return Buffer.from(await res.arrayBuffer());
}
