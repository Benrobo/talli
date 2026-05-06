/**
 * Defensively parse a JSON-shaped response from an LLM.
 *
 * Handles every common failure mode:
 *  - Markdown fences (```json ... ```)
 *  - Trailing commas
 *  - Surrounding commentary ("Sure! Here is the JSON: { ... }")
 *  - Mixed whitespace / newlines
 *
 * Throws when no valid JSON can be extracted, or when `requiredFields`
 * are missing on the parsed object/array.
 */
export function cleanLLMJson(props: {
  response: string;
  requiredFields?: string[];
  preserveFormatting?: boolean;
}) {
  const { response, preserveFormatting = true, requiredFields = [] } = props;

  let stripped = response?.trim() ?? "";
  stripped = stripped.replace(/^```[\w]*\s*\n?/, "");
  stripped = stripped.replace(/\n?\s*```\s*$/, "");
  stripped = stripped.trim();

  if (!preserveFormatting) {
    stripped = stripped.replace(/\\n/g, " ").trim();
  }

  stripped = stripped.replace(/,\s*([\]}])/g, "$1");

  let parsed: unknown;
  try {
    parsed = JSON.parse(stripped);
  } catch {
    const firstBrace = stripped.indexOf("{");
    const firstBracket = stripped.indexOf("[");

    let startIdx = -1;
    let endChar = "";

    if (firstBrace === -1 && firstBracket === -1) {
      throw new Error("Invalid JSON response from LLM.");
    }

    if (firstBrace === -1) {
      startIdx = firstBracket;
      endChar = "]";
    } else if (firstBracket === -1) {
      startIdx = firstBrace;
      endChar = "}";
    } else {
      startIdx = Math.min(firstBrace, firstBracket);
      endChar = startIdx === firstBrace ? "}" : "]";
    }

    const lastEnd = stripped.lastIndexOf(endChar);
    if (lastEnd <= startIdx) {
      throw new Error("Invalid JSON response from LLM.");
    }

    let extracted = stripped.substring(startIdx, lastEnd + 1);
    extracted = extracted.replace(/,\s*([\]}])/g, "$1");
    parsed = JSON.parse(extracted);
  }

  const rec = parsed as Record<string, unknown>;
  const isErrorEnvelope = !Array.isArray(parsed) && rec?.status === "error";
  const effectiveRequired = isErrorEnvelope
    ? requiredFields.filter((f) => f === "status")
    : requiredFields;

  const missing = effectiveRequired
    .filter((f) => f.length > 0)
    .map((f) => f.trim())
    .filter((field) =>
      Array.isArray(parsed)
        ? parsed.every((item) => typeof (item as Record<string, unknown>)[field] === "undefined")
        : typeof rec?.[field] === "undefined"
    );

  if (missing.length > 0) {
    throw new Error(`Invalid format: Missing required fields: [${missing.join(", ")}]`);
  }

  return parsed;
}
