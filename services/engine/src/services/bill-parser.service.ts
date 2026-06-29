import { z } from "zod";
import { ai } from "./ai/index.js";
import { cleanLLMJson } from "../lib/clean-llm-json.js";
import { debugInDev } from "../lib/utils.js";
import logger from "../lib/logger.js";

const billSchema = z.object({
  total: z.number().int().positive().nullable(),
  currency: z.string().nullable(),
  confident: z.boolean(),
  reason: z.string().nullable(),
});

export type ParsedBill = z.infer<typeof billSchema>;

const PROMPT = `You are reading a photo of a bill, receipt, or invoice.

Return ONLY JSON with this shape:
{ "total": <integer amount to pay, no decimals or symbols>, "currency": "<e.g. NGN, USD>", "confident": <true|false>, "reason": "<short reason when not confident, else null>" }

Rules:
- "total" is the FINAL amount due — the grand total after tax/service, not a line item or subtotal. Round to a whole number.
- Naira (₦) is "NGN". If no currency is visible, assume "NGN".
- Talli only handles Naira. If the bill is in any currency OTHER than NGN, set
  "confident" to false and "reason" to a short note like "This bill is in USD — I can only split Naira amounts."
- If you cannot clearly read a total, set "total" to null, "confident" to false,
  and "reason" to why (e.g. "The image is too blurry to read the total.").
- When confident and in Naira, set "reason" to null.
- Return ONLY the JSON. No commentary.`;

/**
 * Reads the amount due off a photographed bill using a vision model. Returns the
 * extracted total (whole-number, currency-stripped) so it can seed a split — the
 * caller must always confirm the number with the user before acting, since OCR
 * can misread.
 */
class BillParserService {
  async parse(image: Buffer): Promise<ParsedBill> {
    const raw = await ai.generateFromImage(PROMPT, image);
    debugInDev((_, saveToFile) => saveToFile("bill-parser-response.txt", raw));
    try {
      const json = cleanLLMJson({ response: raw, requiredFields: ["total"] }) as Record<string, unknown>;
      const bill = billSchema.parse({
        total: json.total ?? null,
        currency: json.currency ?? null,
        confident: json.confident ?? false,
        reason: json.reason ?? null,
      });
      return this.enforceNaira(bill);
    } catch (err) {
      logger.warn(`[bill-parser] failed to read bill: ${(err as Error).message}`);
      return { total: null, currency: null, confident: false, reason: "I couldn't read that bill." };
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
    return bill;
  }
}

export const billParserService = new BillParserService();
export default billParserService;
