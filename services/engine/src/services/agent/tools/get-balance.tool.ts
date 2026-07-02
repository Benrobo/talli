import { z } from "zod";
import { defineTool } from "../define-tool.js";
import { balanceService } from "../../balance.service.js";

export const getBalanceTool = defineTool({
  name: "getBalance",
  label: "tell you your wallet balance and a money overview",
  description:
    "Look up the user's wallet balance and a summary of their money — wallet, savings jars total, and active collections. " +
    "Use for questions like 'what's my balance', 'how much do I have', 'give me an overview'. Read-only.",
  parameters: z.object({}),
  execute: async (_params, ctx) => {
    const overview = await balanceService.overview(ctx.userId);
    return {
      walletBalance: overview.walletBalance,
      currency: overview.currency,
      jarsTotal: overview.jarsTotal,
      jarCount: overview.jars.length,
      collections: overview.collections,
    };
  },
});
