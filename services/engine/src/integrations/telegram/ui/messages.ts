import env from "../../../config/env.js";
import { formatNaira } from "./keyboards.js";

/**
 * Bot @handle wrapped in backticks. The username can contain `_`, which legacy
 * Markdown reads as italic and breaks the message — backticks (code) are parsed
 * literally, so this is safe to drop into Markdown text.
 */
const botMention = `\`@${env.TELEGRAM_BOT_USERNAME || "talli"}\``;

/**
 * Strips legacy-Markdown control characters from a user-supplied label (e.g. a
 * Telegram display name) so it is safe to embed inside `[label](tg://...)`. A
 * stray `_`, `*`, `[` or backtick in a name would otherwise unbalance the
 * message and Telegram would reject the whole send.
 */
function escapeMarkdown(text: string): string {
  return text.replace(/[\[\]()*_`]/g, "").trim() || "member";
}

interface CollectionLine {
  title: string;
  amountPerMember: number | null;
  targetAmount: number | null;
  deadline: string | null;
  collected: number;
  paidCount: number;
  enrolledCount: number;
}

/**
 * Renders one collection's progress block (title, money, paid count, deadline),
 * shared by the `/balance` card and the group status overview so both stay in
 * lockstep. A ✅ marks a collection whose target has been reached.
 */
function collectionBlock(c: CollectionLine): string[] {
  const each = c.amountPerMember ? ` · ${formatNaira(c.amountPerMember)}/person` : "";
  const done = c.targetAmount != null && c.collected >= c.targetAmount;
  const lines = [`*${c.title}*${each}${done ? "  ✅" : ""}`];
  if (c.targetAmount) {
    const pct = Math.min(100, Math.round((c.collected / c.targetAmount) * 100));
    lines.push(`💵 ${formatNaira(c.collected)} of ${formatNaira(c.targetAmount)}  (${pct}%)`);
  } else {
    lines.push(`💵 ${formatNaira(c.collected)} collected`);
  }
  lines.push(`👥 ${c.paidCount} of ${c.enrolledCount} paid`);
  if (c.deadline) lines.push(`📅 Due ${c.deadline}`);
  return lines;
}

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

  linked(workspaceName: string, connectedBy: string): string {
    return [
      "✅ *Talli is connected!*",
      "",
      `Workspace: *${workspaceName}*`,
      `Connected by: ${connectedBy}`,
      "",
      "You're all set. Here's what you can try:",
      '•  _“save ₦2,000 to my rent jar”_',
      '•  _“collect ₦5,000 from the group”_',
      '•  _“send ₦10,000 to GTB 0123456789”_',
    ].join("\n");
  },

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

  disconnectAdminOnly: "🔒 Only a *group admin* can disconnect this group from Talli.",

  alreadyLinked(workspaceName: string): string {
    return [
      "⚠️ *Already connected*",
      "",
      `This chat is already linked to *${workspaceName}*.`,
      "To link it somewhere else, disconnect first with `/disconnect`.",
    ].join("\n");
  },

  disconnected: [
    "✅ *Disconnected*",
    "",
    "This chat is no longer linked to Talli. Run `/start <code>` to connect again.",
  ].join("\n"),

  notConnected: "This chat isn't connected to Talli, so there's nothing to disconnect.",

  groupLinked(workspaceName: string, connectedBy: string): string {
    return [
      "✅ *This group is connected!*",
      "",
      `Workspace: *${workspaceName}*`,
      `Connected by: ${connectedBy}`,
      "",
      `Mention me (${botMention}) with a command, for example:`,
      `${botMention} collect ₦5,000 from everyone`,
    ].join("\n");
  },

  groupNotLinked: [
    "🔒 *This group isn't connected to Talli yet*",
    "",
    "A group admin can link it with `/start <code>` from the dashboard.",
  ].join("\n"),

  /**
   * `/info` — what Talli is, this chat's connection status, and the commands
   * available. `chatLabel` is "this group" or "this chat" depending on context.
   */
  info(params: {
    chatLabel: string;
    connected: boolean;
    workspaceName?: string;
    connectedBy?: string;
  }): string {
    const lines = [
      "ℹ️ *About Talli*",
      "_Your AI treasurer for chat._",
      "",
      "I help you handle money right where you chat:",
      "💰  *Collect* — split bills & group dues",
      "🏦  *Save* — set up savings jars",
      "💸  *Send* — pay out to any bank",
      "",
      "*Status*",
    ];

    if (params.connected) {
      lines.push(
        `🟢 ${params.chatLabel} is *connected*`,
        `• Workspace: *${params.workspaceName}*`,
        `• Connected by: ${params.connectedBy}`
      );
    } else {
      lines.push(`🔴 ${params.chatLabel} is *not connected*`, "• Connect it to start using Talli");
    }

    lines.push(
      "",
      "*Commands*",
      "• `/start <code>` — connect this chat",
      `• mention ${botMention} with a request once connected`,
      "• `/disconnect` — unlink this chat (admin only in groups)",
      "• `/info` — show this message"
    );

    return lines.join("\n");
  },

  collectionPrompt(title: string, amount: number, paidCount: number): string {
    return `*${title}* — ${formatNaira(amount)} each.\nPaid so far: ${paidCount}`;
  },

  paymentConfirmed(name: string, amount: number, paidCount: number): string {
    return `✅ ${name} paid ${formatNaira(amount)}. Paid: ${paidCount}`;
  },

  payFailed: "⚠️ Couldn't start that payment right now. Please try again in a moment.",

  /**
   * Group announcement when a member's collection payment lands. Tags the payer
   * so they see it confirmed, and shows running progress (total collected, toward
   * the target if one was set, and how many have paid). Celebrates completion.
   */
  collectionPaid(p: {
    payerName: string;
    payerId: string | null;
    amount: number;
    title: string;
    collectedTotal: number;
    targetAmount: number | null;
    paidCount: number;
    targetReached: boolean;
  }): string {
    const payer = p.payerId
      ? `[${escapeMarkdown(p.payerName)}](tg://user?id=${p.payerId})`
      : `*${escapeMarkdown(p.payerName)}*`;
    const progress = p.targetAmount
      ? `Collected: *${formatNaira(p.collectedTotal)}* of *${formatNaira(p.targetAmount)}*`
      : `Collected so far: *${formatNaira(p.collectedTotal)}* (${p.paidCount} paid)`;
    const lines = [
      `🎉 ${payer} just paid *${formatNaira(p.amount)}* to *${p.title}*!`,
      "",
      progress,
    ];
    if (p.targetReached) lines.push("", "✅ *Target reached — collection complete!*");
    return lines.join("\n");
  },

  flashAccount(
    amount: number,
    accountNumber: string,
    bankName: string,
    payer?: { id: string; name: string }
  ): string {
    const heading = payer
      ? `💸 [${escapeMarkdown(payer.name)}](tg://user?id=${payer.id}), pay *${formatNaira(amount)}*`
      : `💸 *Pay ${formatNaira(amount)}*`;
    return [
      heading,
      "",
      "Transfer to this account from your bank app:",
      `• Account: \`${accountNumber}\``,
      `• Bank: *${bankName}*`,
      "",
      "I'll confirm here automatically once it lands (usually under a minute).",
    ].join("\n");
  },

  unrecognized: [
    "🤔 *I didn't quite catch that*",
    "",
    "Try something like \"collect ₦5,000 from everyone\" or \"send ₦10,000 to Tolu\".",
  ].join("\n"),

  /**
   * Rich capability guide shown when someone asks what Talli can do / for help. A
   * fixed, well-formatted message (not LLM-improvised) so it's consistent and
   * complete, with a concrete example for each thing Talli does.
   */
  help(scope: "group" | "private"): string {
    const lines = [
      "👋 *Here's what I can do*",
      "_Your AI treasurer — just talk to me normally._",
      "",
      "💰 *Collect money from a group*",
      "Split bills, dues, or contributions. I post a Pay button and track who's paid.",
      "_“collect ₦5,000 from everyone for jerseys”_",
      "_“raise 200k for the party, 10k each, by July 20”_",
      "",
      "📊 *Check progress*",
      "_“how much have we raised?”_",
      "_“status of the jersey collection”_",
    ];

    if (scope === "private") {
      lines.push(
        "",
        "🏦 *Save towards a goal*",
        "Set up a jar with a target and add to it from your wallet.",
        "_“start a rent jar with a ₦200k goal”_",
        "_“save 20k to my rent jar”_",
        "",
        "💸 *Send money to a bank*",
        "I verify the account name before anything leaves your wallet.",
        "_“send ₦10,000 to GTB 0123456789”_",
        "",
        "👛 *See your balance*  — just tap /balance or ask _“what's my balance?”_"
      );
    } else {
      lines.push(
        "",
        "💸 *Savings & sending* are private — _DM me_ for those.",
        "",
        `In this group, mention me: ${botMention} collect ₦5,000 from everyone`
      );
    }

    return lines.join("\n");
  },

  dmOnly: "🔒 That can only be done in a *private chat* with me. DM me to continue.",

  confirmCollection(
    title: string,
    amount: number,
    targetAmount?: number,
    deadline?: string
  ): string {
    return [
      "💰 *Create collection*",
      "",
      `Title: *${title}*`,
      `Amount: *${formatNaira(amount)}* per person`,
      targetAmount ? `Target: *${formatNaira(targetAmount)}*` : "",
      deadline ? `Deadline: *${deadline}*` : "",
      "",
      "\n",
      "*Should I create it?*",
    ]
      .filter(Boolean)
      .join("\n");
  },

  confirmCreateJar(name: string, target: number): string {
    return [
      "🏦 *Create savings jar*",
      "",
      `Name: *${name}*`,
      `🎯 Target: *${formatNaira(target)}*`,
      "",
      "Create it?",
    ].join("\n");
  },

  needsJarName: [
    "🏦 *What should I call this jar?*",
    "",
    "e.g. _\"a rent jar with a 200k goal\"_.",
  ].join("\n"),

  needsJarTarget(name: string): string {
    return [
      `🎯 How much do you want to save in your *${name}* jar?`,
      "",
      "Give me a target, e.g. `200k` or `500,000`.",
    ].join("\n");
  },

  needsSaveAmount(jar: string): string {
    return `💰 How much should I move into your *${jar}* jar?`;
  },

  confirmSaveToJar(jar: string, amount: number): string {
    return [
      "🏦 *Add to savings*",
      "",
      `Jar: *${jar}*`,
      `Amount: *${formatNaira(amount)}* (from your wallet)`,
      "",
      "Continue?",
    ].join("\n");
  },

  confirmSend(p: {
    accountName: string;
    accountNumber?: string;
    bankName?: string;
    amount: number;
  }): string {
    return [
      "💸 *Send money*",
      "",
      `👤 *${p.accountName}*`,
      p.accountNumber && p.bankName
        ? `🏦 ${p.accountNumber} · ${p.bankName}`
        : p.bankName
          ? `🏦 ${p.bankName}`
          : "",
      `💵 *${formatNaira(p.amount)}*`,
      "",
      "Send it?",
    ]
      .filter(Boolean)
      .join("\n");
  },

  bankNotFound(bankName: string): string {
    return [
      `🏦 I couldn't find a bank matching *${escapeMarkdown(bankName)}*.`,
      "",
      "Reply with the exact bank name, e.g. `Zenith Bank` or `GTBank`.",
    ].join("\n");
  },

  accountNotVerified(accountNumber: string, bankName: string): string {
    return [
      `🔎 I couldn't verify *${escapeMarkdown(accountNumber)}* at *${escapeMarkdown(bankName)}*.`,
      "",
      "Double-check the account number and bank, then send them again.",
    ].join("\n");
  },

  collectionCreated(title: string): string {
    return `✅ Collection *${title}* is live. Members can tap the pay button to contribute.`;
  },

  jarCreated(name: string): string {
    return `✅ Savings jar *${name}* created.`;
  },

  savedToJar(jar: string, amount: number): string {
    return `✅ Moved ${formatNaira(amount)} into *${jar}* from your wallet.`;
  },

  jarNotFound(name: string): string {
    return `🔎 I couldn't find a jar called *${name}*. Create one first with "create a ${name} jar".`;
  },

  insufficientForSave(jar: string, amount: number, balance: number): string {
    return [
      `⚠️ Not enough in your wallet to save ${formatNaira(amount)} to *${jar}*.`,
      `Balance: ${formatNaira(balance)}.`,
      "",
      "Top up first, then try again.",
    ].join("\n");
  },

  insufficientForSend(accountName: string, amount: number, balance: number): string {
    return [
      `⚠️ Not enough in your wallet to send ${formatNaira(amount)} to *${accountName}*.`,
      `Balance: ${formatNaira(balance)}.`,
      "",
      "Top up first, then try again.",
    ].join("\n");
  },

  sendQueued(accountName: string, amount: number): string {
    return `✅ ${formatNaira(amount)} to *${accountName}* is processing. I'll confirm once it settles.`;
  },

  sendUnavailable:
    "⚠️ Payouts are being enabled right now and aren't available yet. Your wallet wasn't charged.",

  needsRecipient(name: string): string {
    return [
      `🔎 I don't have *${name}* saved yet.`,
      "",
      "Reply with the account number and bank, e.g. `0123456789 GTB`.",
    ].join("\n");
  },

  actionCancelled: "👍 Okay, cancelled.",

  actionFailed: "⚠️ That didn't go through. Please try again.",

  balanceDmOnly: "🔒 Your balance is private — check it in a *direct message* with me, not in a group.",

  balance(o: {
    walletBalance: number;
    currency: string;
    jars: { name: string; currentAmount: number; targetAmount: number | null }[];
    jarsTotal: number;
    collections: {
      title: string;
      status: string;
      amountPerMember: number | null;
      targetAmount: number | null;
      deadline: string | null;
      collected: number;
      paidCount: number;
      enrolledCount: number;
    }[];
  }): string {
    const lines = [
      "💼 *Your Talli Balance*",
      "",
      `👛 *Wallet:* ${formatNaira(o.walletBalance)}`,
    ];

    lines.push("", "━━━━━━━━━━━━━━", "🏦 *Savings*");
    if (o.jars.length === 0) {
      lines.push("_No jars yet._");
    } else {
      for (const j of o.jars) {
        const target = j.targetAmount ? `  ·  goal ${formatNaira(j.targetAmount)}` : "";
        lines.push(`• *${j.name}* — ${formatNaira(j.currentAmount)}${target}`);
      }
      lines.push(`_Total saved: ${formatNaira(o.jarsTotal)}_`);
    }

    lines.push("", "━━━━━━━━━━━━━━", "💰 *Collections*");
    if (o.collections.length === 0) {
      lines.push("_No active collections._");
    } else {
      o.collections.forEach((c, i) => {
        if (i > 0) lines.push("");
        lines.push(...collectionBlock(c));
      });
    }

    return lines.join("\n");
  },

  /**
   * Collections-only overview for a group status query ("how much have we
   * raised?"). Deliberately omits wallet and savings — those are personal and
   * must never surface in a group chat.
   */
  collectionsOverview(collections: CollectionLine[]): string {
    if (collections.length === 0) {
      return "💰 *Collections*\n\n_No active collections yet._";
    }
    const lines = ["💰 *Collections*"];
    collections.forEach((c) => {
      lines.push("");
      lines.push(...collectionBlock(c));
    });
    return lines.join("\n");
  },
};
