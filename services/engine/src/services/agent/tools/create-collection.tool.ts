import { z } from "zod";
import { defineTool } from "../define-tool.js";

export const createCollectionTool = defineTool({
  name: "createCollection",
  label: "start a collection to gather money from the group",
  description:
    "Prepare a group collection — money gathered from everyone (a split bill, dues, contributions). " +
    "Use for 'collect 5k from everyone', 'let's each put in 2000 for the gift'. Needs a short title and the amount per person. " +
    "This does NOT create it — it prepares a confirm card the user taps. Group + admin only.",
  parameters: z.object({
    title: z.string().describe("A short, natural name for the collection, e.g. 'Saturday football'."),
    amountPerMember: z.number().int().positive().describe("Whole-naira amount each person pays."),
    targetAmount: z.number().int().positive().optional().describe("Optional overall target in naira."),
    deadline: z.string().optional().describe("Optional deadline, e.g. 'Friday' or an ISO date."),
  }),
  execute: async ({ title, amountPerMember, targetAmount, deadline }, ctx) => {
    if (ctx.scope !== "group") {
      return { ok: false, reason: "Collections are created from a group chat, not a DM." };
    }
    if (!ctx.isGroupAdmin) {
      return { ok: false, reason: "Only a group admin can start a collection." };
    }
    ctx.emit.proposal({
      intent: "create_collection",
      status: "ready",
      title,
      amount: amountPerMember,
      targetAmount,
      deadline,
    });
    return { ok: true, prepared: { title, amountPerMember, targetAmount, deadline } };
  },
});
