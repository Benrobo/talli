import { z } from "zod";

export const INTENTS = [
  "create_collection",
  "create_jar",
  "save_to_jar",
  "send_money",
  "status_query",
  "unknown",
] as const;

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
  clarification: opt(z.string()),
  amount: opt(z.number().int().positive()),
  title: opt(z.string()),
  recipientName: opt(z.string()),
  accountNumber: opt(z.string()),
  bankName: opt(z.string()),
  targetAmount: opt(z.number().int().positive()),
  deadline: opt(z.string()),
  target: opt(z.string()),
});

export type Intent = z.infer<typeof intentSchema>;
export type IntentName = (typeof INTENTS)[number];
