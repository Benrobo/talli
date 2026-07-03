import dayjs from "dayjs";
import { InlineKeyboard } from "grammy";
import { CALLBACK_ACTION, encodeCallback } from "../types.js";

/**
 * Reusable inline-keyboard builders. Define each button once here, never inline
 * in a handler — so text and callback data stay consistent across flows.
 */

export function receiptListKeyboard(
  items: { reference: string; amount: number; label: string }[]
): InlineKeyboard {
  const kb = new InlineKeyboard();
  for (const item of items) {
    kb.text(`🧾 ${formatNaira(item.amount)} · ${item.label}`, encodeCallback(CALLBACK_ACTION.receipt, item.reference)).row();
  }
  return kb;
}

export function selectCollectionKeyboard(
  items: { id: string; title: string; amount: number; createdAt: Date }[]
): InlineKeyboard {
  const kb = new InlineKeyboard();
  for (const item of items) {
    const date = dayjs(item.createdAt).format("DD MMM");
    const amountLabel = item.amount > 0 ? formatNaira(item.amount) : "Open pot";
    kb.text(`💰 ${item.title} · ${amountLabel} · ${date}`, encodeCallback(CALLBACK_ACTION.selectCollection, item.id)).row();
  }
  return kb;
}

export function confirmCancel(actionId: string): InlineKeyboard {
  return new InlineKeyboard()
    .text("✅ Confirm", encodeCallback(CALLBACK_ACTION.confirm, actionId))
    .text("✖️ Cancel", encodeCallback(CALLBACK_ACTION.cancel, actionId));
}

/**
 * Telegram rejects inline URL buttons that aren't public https links (a local
 * `http://localhost` dev URL throws "Wrong HTTP URL"). So we only render a URL
 * button when the link is actually reachable; otherwise the message still sends,
 * just without the button.
 */
function isPublicUrl(url: string): boolean {
  return /^https:\/\//i.test(url) && !/localhost|127\.0\.0\.1/i.test(url);
}

export function connectTalli(webAppUrl: string): InlineKeyboard | undefined {
  const url = `${webAppUrl}/onboarding?connect=telegram`;
  if (!isPublicUrl(url)) return undefined;
  return new InlineKeyboard().url("Connect Talli", url);
}

export function openDashboard(webAppUrl: string, label = "Open dashboard"): InlineKeyboard | undefined {
  if (!isPublicUrl(webAppUrl)) return undefined;
  return new InlineKeyboard().url(label, webAppUrl);
}

export function openBillLink(url: string): InlineKeyboard | undefined {
  if (!isPublicUrl(url)) return undefined;
  return new InlineKeyboard().url("Open the bill", url);
}

/**
 * The pay keyboard for a collection, chosen by mode. A fixed collection leads with
 * the in-chat "Pay ₦X" tap (which ties the payer to their chat identity) and adds a
 * secondary "pay by link" button. An open pot is link-first: a single URL button to
 * the web pay page. URL buttons are dropped when the link isn't public (dev), so the
 * message still sends and the tappable URL in the text carries it instead.
 */
export function collectionPayKeyboard(
  collection: { id: string; amountPerMember: number | null },
  payLink: string
): InlineKeyboard | undefined {
  const isFixed = collection.amountPerMember != null && collection.amountPerMember > 0;
  const linkOk = isPublicUrl(payLink);

  if (isFixed) {
    const kb = new InlineKeyboard().text(
      `Pay ${formatNaira(collection.amountPerMember!)}`,
      encodeCallback(CALLBACK_ACTION.pay, collection.id)
    );
    if (linkOk) kb.row().url("🔗 Pay by link instead", payLink);
    return kb;
  }

  if (linkOk) return new InlineKeyboard().url("💳 Contribute", payLink);
  return undefined;
}

/**
 * Action keyboard for `/info`. Shows the dashboard link plus context-aware
 * shortcuts: connected chats get a refresh + disconnect, unconnected ones get
 * a connect prompt. URL buttons are dropped when the web app URL isn't public.
 */
export function infoActions(webAppUrl: string, connected: boolean): InlineKeyboard | undefined {
  const publicUrl = isPublicUrl(webAppUrl);
  const kb = new InlineKeyboard();
  if (publicUrl) kb.url("📊 Open dashboard", webAppUrl).row();
  if (connected) {
    kb.text("🔄 Refresh status", encodeCallback(CALLBACK_ACTION.info, "refresh"))
      .text("🔌 Disconnect", encodeCallback(CALLBACK_ACTION.disconnect, "chat"));
  } else if (publicUrl) {
    kb.url("🔗 Connect Talli", `${webAppUrl}/onboarding?connect=telegram`);
  }
  return kb.inline_keyboard.length > 0 ? kb : undefined;
}

export function formatNaira(amount: number): string {
  return `₦${amount.toLocaleString("en-NG")}`;
}
