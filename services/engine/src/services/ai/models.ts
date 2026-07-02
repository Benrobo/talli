import type { LanguageModelV2 } from "@ai-sdk/provider";
import { openrouter } from "./provider.js";

const model = (id: string): LanguageModelV2 => openrouter(id);

/**
 * Catalog of model bindings used across the engine. Adding a new model here
 * makes it available to features through ModelKit and the typed `MODELS` map.
 */
export const MODELS = {
  google: {
    geminiFlash: model("google/gemini-2.5-flash"),
    geminiPro: model("google/gemini-2.5-pro"),
  },
  openai: {
    gpt4oMini: model("openai/gpt-4o-mini"),
    gpt4o: model("openai/gpt-4o"),
  },
  anthropic: {
    haiku: model("anthropic/claude-haiku-4-5"),
    sonnet: model("anthropic/claude-sonnet-4-5"),
  },
  deepseek: {
    chat: model("deepseek/deepseek-chat"),
  },
} as const;

export const DEFAULT_MODEL = MODELS.google.geminiFlash;
