import { z } from "zod";

export const INTENTS = [
  "create_collection",
  "create_jar",
  "save_to_jar",
  "send_money",
  "status_query",
  "help_query",
  "pay_collection",
  "split_payment",
  "unknown",
] as const;

export const SPLIT_MODES = ["even", "custom", "by_count"] as const;
export type SplitMode = (typeof SPLIT_MODES)[number];

/**
 * Optional field that also tolerates an explicit `null` from the model (LLMs
 * routinely emit `"amount": null` for "not provided"); `null` is normalized to
 * `undefined` so callers can rely on a single absent value.
 */
const opt = <T extends z.ZodTypeAny>(schema: T) =>
  schema.nullish().transform((v) => v ?? undefined);

export const intentSchema = z.object({
  intent: z.enum(INTENTS),
  status: z.enum(["ready", "needs_clarification"]),
  /** A question asked when an action is missing info (status needs_clarification). */
  clarification: opt(z.string()),
  /** A natural conversational reply for greetings, acknowledgments, or "unknown". */
  reply: opt(z.string()),
  amount: opt(z.number().int().positive()),
  title: opt(z.string()),
  recipientName: opt(z.string()),
  accountNumber: opt(z.string()),
  bankName: opt(z.string()),
  targetAmount: opt(z.number().int().positive()),
  deadline: opt(z.string()),
  target: opt(z.string()),
  /** Filled by the dispatcher after a Nomba lookup — not produced by the LLM. */
  resolvedAccountName: opt(z.string()),
  resolvedBankCode: opt(z.string()),
  splitMode: opt(z.enum(SPLIT_MODES)),
  count: opt(z.number().int().positive()),
  members: opt(
    z.array(
      z.object({
        name: z.string(),
        amount: opt(z.number().int().positive()),
      })
    )
  ),
});

export type Intent = z.infer<typeof intentSchema>;
export type IntentName = (typeof INTENTS)[number];
