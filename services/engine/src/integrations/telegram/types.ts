import type { Context } from "grammy";

/** Talli's grammY context. Extend here as flows need extra typed fields. */
export type TalliContext = Context;

/** Inline-button actions. Callback data on the wire is `action:arg`, e.g. `pay:col_8af2`. */
export const CALLBACK_ACTION = {
  pay: "pay",
  confirm: "confirm",
  cancel: "cancel",
  info: "info",
  disconnect: "disconnect",
} as const;

export type CallbackAction = (typeof CALLBACK_ACTION)[keyof typeof CALLBACK_ACTION];

export function encodeCallback(action: CallbackAction, arg: string): string {
  return `${action}:${arg}`;
}

export function decodeCallback(data: string): { action: string; arg: string } {
  const idx = data.indexOf(":");
  if (idx === -1) return { action: data, arg: "" };
  return { action: data.slice(0, idx), arg: data.slice(idx + 1) };
}
