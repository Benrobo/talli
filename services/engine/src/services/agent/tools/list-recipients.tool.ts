import { z } from "zod";
import { defineTool } from "../define-tool.js";
import { beneficiaryService } from "../../beneficiary.service.js";

export const listRecipientsTool = defineTool({
  name: "listRecipients",
  label: "show the people you've saved to send money to",
  description:
    "List the recipients (beneficiaries) the user has saved for sending money — their alias, account name, " +
    "bank, and account number. Use for 'how many recipients do I have', 'who have I saved', 'list my " +
    "beneficiaries', 'show my saved accounts'. Read-only.",
  parameters: z.object({}),
  execute: async (_params, ctx) => {
    const recipients = await beneficiaryService.listForContext(ctx.userId);
    return {
      count: recipients.length,
      recipients: recipients.map((r) => ({
        name: r.alias,
        accountName: r.accountName,
        bank: r.bankName,
        accountNumber: r.accountNumber,
      })),
    };
  },
});
