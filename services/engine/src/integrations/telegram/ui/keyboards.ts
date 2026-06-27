import { InlineKeyboard } from "grammy";
import { CALLBACK_ACTION, encodeCallback } from "../types.js";

/**
 * Reusable inline-keyboard builders. Define each button once here, never inline
 * in a handler — so text and callback data stay consistent across flows.
 */

export function payButton(collectionId: string, amount: number): InlineKeyboard {
  return new InlineKeyboard().text(
    `Pay ${formatNaira(amount)}`,
    encodeCallback(CALLBACK_ACTION.pay, collectionId)
  );
}

export function confirmCancel(actionId: string): InlineKeyboard {
  return new InlineKeyboard()
    .text("✅ Confirm", encodeCallback(CALLBACK_ACTION.confirm, actionId))
    .text("✖️ Cancel", encodeCallback(CALLBACK_ACTION.cancel, actionId));
}

export function connectTalli(webAppUrl: string): InlineKeyboard {
  return new InlineKeyboard().url(
    "Connect Talli",
    `${webAppUrl}/onboarding?connect=telegram`
  );
}

export function openDashboard(webAppUrl: string, label = "Open dashboard"): InlineKeyboard {
  return new InlineKeyboard().url(label, webAppUrl);
}

export function formatNaira(amount: number): string {
  return `₦${amount.toLocaleString("en-NG")}`;
}
