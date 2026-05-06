import { generateText, streamText as _streamText, type LanguageModel } from "ai";
import retry from "async-retry";
import { MODELS, DEFAULT_MODEL } from "./models.js";
import logger from "../../lib/logger.js";

type ModelInstance = Exclude<LanguageModel, string>;

const DEFAULT_TEMPERATURE = 0.3;
const DEFAULT_MAX_TOKENS = 8192;

const FALLBACK_MODELS: ModelInstance[] = [
  MODELS.google.geminiFlash,
  MODELS.deepseek.chat,
  MODELS.anthropic.haiku,
];

export interface AIOptions {
  model?: ModelInstance;
  temperature?: number;
  maxTokens?: number;
}

function getModelId(model: ModelInstance): string {
  return (model as unknown as { modelId?: string }).modelId ?? "unknown";
}

async function generateOnce(
  prompt: string,
  model: ModelInstance,
  temperature: number,
  maxTokens: number
): Promise<string> {
  return retry(
    async () => {
      const result = await generateText({
        model,
        prompt,
        temperature,
        maxOutputTokens: maxTokens,
      });
      return result.text;
    },
    {
      retries: 2,
      factor: 2,
      minTimeout: 1000,
      maxTimeout: 5000,
      onRetry: (err, attempt) => {
        logger.warn(
          `[ai] generate failed (attempt ${attempt}/3) [${getModelId(model)}]: ${(err as Error)?.message}`
        );
      },
    }
  );
}

/**
 * Generate text with automatic provider failover. The primary model is tried
 * first; if it errors out (rate limits, overloads), each fallback model is
 * tried in order.
 */
export async function generate(prompt: string, options?: AIOptions): Promise<string> {
  const primary = options?.model ?? DEFAULT_MODEL;
  const temperature = options?.temperature ?? DEFAULT_TEMPERATURE;
  const maxTokens = options?.maxTokens ?? DEFAULT_MAX_TOKENS;

  const modelsToTry = [primary, ...FALLBACK_MODELS.filter((m) => m !== primary)];
  let lastError: unknown;

  for (const model of modelsToTry) {
    try {
      return await generateOnce(prompt, model, temperature, maxTokens);
    } catch (err) {
      lastError = err;
      logger.warn(
        `[ai] falling back from [${getModelId(model)}]: ${(err as Error)?.message}`
      );
    }
  }
  throw lastError ?? new Error("AI generation exhausted all providers");
}

/**
 * Stream text from the primary model. Falls back are not applied to streams
 * because partial output cannot be retried mid-flight.
 */
export async function streamText(
  prompt: string,
  options?: AIOptions
): Promise<AsyncIterable<string>> {
  const model = options?.model ?? DEFAULT_MODEL;
  const temperature = options?.temperature ?? DEFAULT_TEMPERATURE;
  const maxTokens = options?.maxTokens ?? DEFAULT_MAX_TOKENS;

  const result = _streamText({
    model,
    prompt,
    temperature,
    maxOutputTokens: maxTokens,
  });
  return result.textStream;
}

export const ai = { generate, streamText };
export { MODELS, DEFAULT_MODEL } from "./models.js";
export { openrouter } from "./provider.js";
