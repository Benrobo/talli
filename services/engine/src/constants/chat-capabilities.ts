import type { IntentName } from "../schemas/intent.schema.js";

/**
 * Single source of truth for what the bot will do in a group chat versus a
 * private DM. The rules used to live inline in three places — the parser, the
 * dispatcher, and the Telegram confirm handler — and had already drifted into
 * two copies of the admin-only list. Everything that gates behaviour by chat
 * type now imports from here so the policy is defined once.
 */

export type ChatScope = "private" | "group";

/**
 * Telegram chat types that count as a group. A `supergroup` is just a group
 * that grew past Telegram's small-group limit; both are gated identically.
 */
export const GROUP_TELEGRAM_CHAT_TYPES = ["group", "supergroup"] as const;

/**
 * Intents that only make sense in a private DM — they move the owner's own
 * money or touch personal jars, so they are never offered in a shared group.
 */
export const DM_ONLY_INTENTS: IntentName[] = ["send_money", "save_to_jar", "create_jar"];

/**
 * Intents safe to run in a group chat. The parser is told this set, and the
 * dispatcher re-checks it at execute time (the model is not trusted to gate).
 */
export const GROUP_ALLOWED_INTENTS: IntentName[] = [
  "create_collection",
  "status_query",
  "help_query",
  "pay_collection",
  "split_payment",
  "person_picker",
];

/**
 * Group-allowed intents that additionally require the sender to be a group
 * admin — anything that creates a shared, payable artifact for the whole group.
 */
export const ADMIN_ONLY_IN_GROUP_INTENTS: IntentName[] = ["create_collection", "split_payment", "person_picker"];

/** The intents permitted for a given chat scope. */
export function allowedIntents(scope: ChatScope): IntentName[] {
  return scope === "group" ? GROUP_ALLOWED_INTENTS : [...GROUP_ALLOWED_INTENTS, ...DM_ONLY_INTENTS];
}

/** Whether an intent may run in the given chat scope. */
export function isAllowedIntent(scope: ChatScope, intent: IntentName): boolean {
  return allowedIntents(scope).includes(intent);
}

/** Whether an intent requires group-admin rights when run in a group. */
export function isAdminOnlyInGroup(intent: IntentName): boolean {
  return ADMIN_ONLY_IN_GROUP_INTENTS.includes(intent);
}
