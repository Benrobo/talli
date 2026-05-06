import { openrouter } from "./provider.js";

/**
 * Catalog of model bindings used across the engine. Adding a new model here
 * makes it available to features through ModelKit and the typed `MODELS` map.
 */
export const MODELS = {
  google: {
    geminiFlash: openrouter("google/gemini-2.5-flash"),
    geminiPro: openrouter("google/gemini-2.5-pro"),
  },
  openai: {
    gpt4oMini: openrouter("openai/gpt-4o-mini"),
    gpt4o: openrouter("openai/gpt-4o"),
  },
  anthropic: {
    haiku: openrouter("anthropic/claude-haiku-4-5"),
    sonnet: openrouter("anthropic/claude-sonnet-4-5"),
  },
  deepseek: {
    chat: openrouter("deepseek/deepseek-chat"),
  },
} as const;

export const DEFAULT_MODEL = MODELS.google.geminiFlash;
