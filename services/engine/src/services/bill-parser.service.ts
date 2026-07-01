import { z } from "zod";
import { ai } from "./ai/index.js";
import { cleanLLMJson } from "../lib/clean-llm-json.js";
import { debugInDev } from "../lib/utils.js";
import logger from "../lib/logger.js";

const billItemSchema = z.object({
  name: z.string().trim().min(1),
  unitPrice: z.number().int().positive(),
  quantity: z.number().int().positive().optional(),
});

const billSchema = z.object({
  total: z.number().int().positive().nullable(),
  currency: z.string().nullable(),
  confident: z.boolean(),
  reason: z.string().nullable(),
  items: z.array(billItemSchema).default([]),
});

export type ParsedBillItem = z.infer<typeof billItemSchema>;
export type ParsedBill = z.infer<typeof billSchema>;

const PROMPT = `You are reading a photo of a bill, receipt, or invoice.

Return ONLY JSON with this shape:
{
  "total": <integer grand total, no decimals or symbols, or null>,
  "currency": "<e.g. NGN, USD>",
  "confident": <true|false>,
  "reason": "<short reason when not confident, else null>",
  "items": [
    { "name": "<line item label>", "unitPrice": <integer naira per unit>, "quantity": <optional integer count on receipt> }
  ]
}

Rules:
- "total" is the FINAL amount due — grand total after tax/service, not a subtotal.
- "items" lists each purchasable line with its unit price in whole naira. Skip tax/service/tip lines unless they are separate selectable charges.
- If quantity is shown on the receipt, include it; otherwise omit quantity.
- Naira (₦) is "NGN". If no currency is visible, assume "NGN".
- Talli only handles Naira. If the bill is in any currency OTHER than NGN, set "confident" to false.
- If you cannot clearly read items AND a total, set "confident" to false and explain in "reason".
- When confident and in Naira, set "reason" to null.
- Return ONLY the JSON. No commentary.`;

class BillParserService {
  async parse(image: Buffer): Promise<ParsedBill> {
    const raw = await ai.generateFromImage(PROMPT, image);
    debugInDev((_, saveToFile) => saveToFile("bill-parser-response.txt", raw));
    try {
      const json = cleanLLMJson({ response: raw, requiredFields: ["total", "items"] }) as Record<
        string,
        unknown
      >;
      const bill = billSchema.parse({
        total: json.total ?? null,
        currency: json.currency ?? null,
        confident: json.confident ?? false,
        reason: json.reason ?? null,
        items: Array.isArray(json.items) ? json.items : [],
      });
      return this.enforceNaira(bill);
    } catch (err) {
      logger.warn(`[bill-parser] failed to read bill: ${(err as Error).message}`);
      return { total: null, currency: null, confident: false, reason: "I couldn't read that bill.", items: [] };
    }
  }

  /**
   * Talli only splits Naira, so a non-NGN bill is forced to not-confident with a
   * reason even if the model returned a total — we never silently split a foreign
   * currency as if it were Naira.
   */
  private enforceNaira(bill: ParsedBill): ParsedBill {
    if (bill.currency && bill.currency.toUpperCase() !== "NGN") {
      return {
        ...bill,
        confident: false,
        reason: bill.reason ?? `This bill is in ${bill.currency} — I can only split Naira (₦) amounts.`,
      };
    }
    if (bill.confident && bill.items.length === 0) {
      return {
        ...bill,
        confident: false,
        reason: bill.reason ?? "I couldn't read individual items off that receipt.",
      };
    }
    return bill;
  }
}

export const billParserService = new BillParserService();
export default billParserService;
