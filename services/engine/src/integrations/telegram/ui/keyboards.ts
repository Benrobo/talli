import dayjs from "dayjs";
import { InlineKeyboard } from "grammy";
import { CALLBACK_ACTION, encodeCallback } from "../types.js";

/**
 * Reusable inline-keyboard builders. Define each button once here, never inline
 * in a handler — so text and callback data stay consistent across flows.
 */

/**
 * The pay button for a collection. A fixed collection shows the set amount and
 * taps straight to a flash account; an open pot (amount 0/undefined) shows
 * "Contribute" and taps into the ask-for-amount flow instead.
 */
export function payButton(collectionId: string, amount: number): InlineKeyboard {
  if (amount > 0) {
    return new InlineKeyboard().text(
      `Pay ${formatNaira(amount)}`,
      encodeCallback(CALLBACK_ACTION.pay, collectionId)
    );
  }
  return new InlineKeyboard().text(
    "Contribute",
    encodeCallback(CALLBACK_ACTION.contribute, collectionId)
  );
}

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

/** Pay / Contribute inline action plus a public pay-page link when available. */
export function collectionPayKeyboard(
  collectionId: string,
  amountPerMember: number | null | undefined,
  payUrl: string
): InlineKeyboard {
  const kb = payButton(collectionId, amountPerMember ?? 0);
  if (isPublicUrl(payUrl)) {
    kb.row().url("Pay via link", payUrl);
  }
  return kb;
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
