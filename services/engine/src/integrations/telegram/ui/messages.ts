import env from "../../../config/env.js";
import { formatNaira } from "./keyboards.js";

/**
 * Bot @handle wrapped in backticks. The username can contain `_`, which legacy
 * Markdown reads as italic and breaks the message — backticks (code) are parsed
 * literally, so this is safe to drop into Markdown text.
 */
const botMention = `\`@${env.TELEGRAM_BOT_USERNAME || "talli"}\``;

/** Reusable Markdown message text, kept here so copy stays consistent across flows. */
export const messages = {
  startNoCode: [
    "👋 *Welcome to Talli*",
    "_Your AI treasurer for chat._",
    "",
    "I help you handle money right here in Telegram:",
    "💰  *Collect* — split bills & group dues",
    "🏦  *Save* — set up savings jars",
    "💸  *Send* — pay out to any bank",
    "",
    "Tap *Connect Talli* below to link this chat to your account and get started.",
  ].join("\n"),

  notLinked: [
    "🔒 *This chat isn't connected yet*",
    "",
    "Link it to your Talli account first — it takes a few seconds.",
    "Tap *Connect Talli* below 👇",
  ].join("\n"),

  linked: [
    "✅ *Talli is connected!*",
    "",
    "You're all set. Here's what you can try:",
    '•  _“save ₦2,000 to my rent jar”_',
    '•  _“collect ₦5,000 from the group”_',
    '•  _“send ₦10,000 to GTB 0123456789”_',
  ].join("\n"),

  invalidCode: [
    "⚠️ *That link code didn't work*",
    "",
    "It may have expired or already been used.",
    "Head back to your dashboard and generate a fresh one.",
  ].join("\n"),

  groupAdded: [
    "👋 *Thanks for adding Talli!*",
    "",
    "I help this group collect money, run savings, and send payouts.",
    "",
    "To get started, a *group admin* should connect this group:",
    "1️⃣  Generate a group link code in your Talli dashboard",
    "2️⃣  Send `/start <code>` here",
    "",
    `Once linked, mention me (${botMention}) to give commands.`,
  ].join("\n"),

  groupReconnected: "👋 Talli is back. This group is already connected — mention me to give commands.",

  groupNeedsCode: [
    "🔗 *Connect this group*",
    "",
    "A group admin can link it with `/start <code>` — generate the code from your Talli dashboard.",
  ].join("\n"),

  groupAdminOnly: "🔒 Only a *group admin* can connect this group to Talli.",

  groupLinked: [
    "✅ *This group is connected!*",
    "",
    `Mention me (${botMention}) with a command, for example:`,
    `${botMention} collect ₦5,000 from everyone`,
  ].join("\n"),

  groupNotLinked: [
    "🔒 *This group isn't connected to Talli yet*",
    "",
    "A group admin can link it with `/start <code>` from the dashboard.",
  ].join("\n"),

  collectionPrompt(title: string, amount: number, paidCount: number): string {
    return `*${title}* — ${formatNaira(amount)} each.\nPaid so far: ${paidCount}`;
  },

  paymentConfirmed(name: string, amount: number, paidCount: number): string {
    return `✅ ${name} paid ${formatNaira(amount)}. Paid: ${paidCount}`;
  },

  unrecognized: [
    "🤔 *I didn't quite catch that*",
    "",
    "Natural-language commands are coming soon. For now, manage everything from your dashboard.",
  ].join("\n"),
};
