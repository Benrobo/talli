import { z } from "zod";
import { defineTool } from "../define-tool.js";

export const createCollectionTool = defineTool({
  name: "createCollection",
  label: "start a collection to gather money from the group",
  description:
    "Prepare a group collection — money gathered from everyone (dues, a gift, contributions). " +
    "Two kinds: a FIXED collection where everyone pays the same set amount (pass amountPerMember, e.g. 'each pays 2000'), " +
    "or an OPEN pot where people chip in any amount they want (leave amountPerMember out; optionally pass targetAmount as the goal). " +
    "If they say 'open pot', 'anyone can contribute', 'any amount', it's OPEN — do NOT ask how much per person. " +
    "This does NOT create it — it prepares a confirm card the user taps. Group + admin only.",
  parameters: z.object({
    title: z.string().describe("A short, natural name for the collection, e.g. 'Saturday football'."),
    amountPerMember: z
      .number()
      .int()
      .positive()
      .optional()
      .describe("For a FIXED collection: whole-naira amount each person pays. Omit for an open pot."),
    targetAmount: z
      .number()
      .int()
      .positive()
      .optional()
      .describe("Optional overall goal in naira. For an open pot this is the target people chip toward."),
    deadline: z.string().optional().describe("Optional deadline, e.g. 'Friday' or an ISO date."),
  }),
  execute: async ({ title, amountPerMember, targetAmount, deadline }, ctx) => {
    if (ctx.scope !== "group") {
      return { ok: false, reason: "Collections are created from a group chat, not a DM." };
    }
    if (!ctx.isGroupAdmin) {
      return { ok: false, reason: "Only a group admin can start a collection." };
    }
    if (!amountPerMember && !targetAmount) {
      return {
        ok: false,
        reason:
          "An open pot needs a goal, or a fixed collection needs a per-person amount — ask for one before creating.",
      };
    }
    ctx.emit.proposal({
      intent: "create_collection",
      status: "ready",
      title,
      amount: amountPerMember,
      targetAmount,
      deadline,
    });
    return {
      ok: true,
      prepared: { title, kind: amountPerMember ? "fixed" : "open", amountPerMember, targetAmount, deadline },
    };
  },
});
