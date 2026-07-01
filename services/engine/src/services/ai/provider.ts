import { createOpenRouter } from "@openrouter/ai-sdk-provider";
import env from "../../config/env.js";

/**
 * Shared OpenRouter provider. Pick a specific model by passing an id, e.g.
 * `openrouter("google/gemini-2.5-flash")`.
 */
export const openrouter = createOpenRouter({
  apiKey: env.OPENROUTER_API_KEY,
});
