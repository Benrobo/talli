import { z } from "zod";
import { defineTool } from "../define-tool.js";
import { transferService } from "../../transfer.service.js";
import { ledgerService } from "../../ledger.service.js";

export const sendMoneyTool = defineTool({
  name: "sendMoney",
  label: "send money to a bank account",
  description:
    "Prepare a bank transfer out of the wallet. Use for 'send 10k to Tolu', 'transfer 5000 to GTB 0123456789'. " +
    "Needs the amount and a destination: EITHER a saved recipient name (see 'Saved recipients' in context — prefer this, " +
    "it avoids a fresh bank lookup) OR an account number plus bank. When the user pays a fresh account and gives it a name " +
    "(e.g. 'send 5k to Mum 0123 GTB'), pass that as recipientName so it's saved for next time. " +
    "It resolves and verifies the account, then prepares a confirm card showing the real account holder. It does not send money. DM only.",
  parameters: z.object({
    amount: z.number().int().positive().describe("Whole-naira amount to send."),
    recipientName: z
      .string()
      .optional()
      .describe(
        "A recipient name/alias. If it matches a saved recipient, that account is reused (no bank lookup). " +
          "If the user names a fresh account, pass the name here so it's saved."
      ),
    accountNumber: z.string().optional().describe("Destination account number, when given."),
    bankName: z.string().optional().describe("Destination bank name, when given with an account number."),
  }),
  execute: async ({ amount, recipientName, accountNumber, bankName }, ctx) => {
    if (ctx.scope !== "private") {
      return { ok: false, reason: "Sending money is personal — this only works in a DM with me." };
    }
    if (!recipientName && !accountNumber) {
      return { ok: false, reason: "no_destination" };
    }

    let resolvedAccountNumber = accountNumber;
    let resolvedBankName = bankName;
    let resolvedAccountName: string | undefined;
    let resolvedBankCode: string | undefined;

    if (recipientName) {
      const saved = await transferService.resolveRecipient(ctx.userId, recipientName);
      if (saved.found) {
        resolvedAccountNumber = saved.accountNumber;
        resolvedBankName = saved.bankName;
        resolvedAccountName = saved.accountName;
        resolvedBankCode = saved.bankCode;
      }
    }

    if (!resolvedAccountName) {
      if (!resolvedAccountNumber || !resolvedBankName) {
        return { ok: false, reason: "need_account_and_bank", recipientName };
      }
      const verified = await transferService.verifyDestination(resolvedAccountNumber, resolvedBankName);
      if (!verified.ok) {
        return { ok: false, reason: verified.reason, accountNumber: resolvedAccountNumber, bankName: resolvedBankName };
      }
      resolvedAccountNumber = verified.accountNumber;
      resolvedBankName = verified.bankName;
      resolvedAccountName = verified.accountName;
      resolvedBankCode = verified.bankCode;
    }

    const balance = await ledgerService.getBalance(ctx.userId);
    if (balance < amount) {
      return { ok: false, reason: "insufficient_balance", walletBalance: balance, needed: amount };
    }

    ctx.emit.proposal({
      intent: "send_money",
      status: "ready",
      amount,
      recipientName,
      accountNumber: resolvedAccountNumber,
      bankName: resolvedBankName,
      resolvedAccountName,
      resolvedBankCode,
    });
    return { ok: true, prepared: { amount, accountName: resolvedAccountName, bank: resolvedBankName } };
  },
});
