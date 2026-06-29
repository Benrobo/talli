import { generateText, streamText as _streamText, type LanguageModel } from "ai";
import retry from "async-retry";
import type { OpenRouterModelId } from "@benrobo/modelkit";
import { MODELS, DEFAULT_MODEL } from "./models.js";
import { openrouter } from "./provider.js";
import { modelKit } from "../../config/modelkit.config.js";
import type { FeatureId } from "../../modelkit.generated.js";
import logger from "../../lib/logger.js";

type ModelInstance = Exclude<LanguageModel, string>;

const DEFAULT_FALLBACK_MODEL = "google/gemini-2.5-flash";
const DEFAULT_TEMPERATURE = 0.3;
const DEFAULT_MAX_TOKENS = 8192;

const FALLBACK_MODELS: ModelInstance[] = [
  MODELS.google.geminiFlash,
  MODELS.deepseek.chat,
  MODELS.anthropic.haiku,
];

const VISION_MODEL: ModelInstance = MODELS.google.geminiFlash;
const VISION_FALLBACK_MODELS: ModelInstance[] = [MODELS.google.geminiFlash, MODELS.openai.gpt4oMini];

export interface AIOptions {
  model?: ModelInstance;
  temperature?: number;
  maxTokens?: number;
}

export interface ModelForFeatureResult {
  model: ModelInstance;
  temperature: number;
  maxTokens: number;
}

/**
 * Resolves a feature id to a model + options, honouring Redis overrides set via
 * the modelkit admin router. On first use it persists the fallback as the
 * override so the feature shows up in the modelkit studio and can be retuned
 * without a redeploy.
 */
export async function getModelForFeature(
  featureId: FeatureId,
  fallbackOpenRouterId: string = DEFAULT_FALLBACK_MODEL
): Promise<ModelForFeatureResult> {
  const existing = await modelKit.getConfig(featureId);
  if (!existing) {
    await modelKit.setOverride(featureId, {
      modelId: fallbackOpenRouterId as OpenRouterModelId,
      temperature: DEFAULT_TEMPERATURE,
      maxTokens: DEFAULT_MAX_TOKENS,
    });
  }

  const modelId = await modelKit.getModel(featureId, fallbackOpenRouterId as OpenRouterModelId);
  const config = await modelKit.getConfig(featureId);

  return {
    model: openrouter(modelId) as ModelInstance,
    temperature: config?.temperature ?? DEFAULT_TEMPERATURE,
    maxTokens: config?.maxTokens ?? DEFAULT_MAX_TOKENS,
  };
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

/**
 * Generate text from an image plus an instruction, with the same provider
 * failover as {@link generate}. Used for vision tasks like reading the total off
 * a photographed bill. Only vision-capable models are tried.
 */
export async function generateFromImage(
  prompt: string,
  image: Buffer,
  options?: AIOptions
): Promise<string> {
  const primary = options?.model ?? VISION_MODEL;
  const temperature = options?.temperature ?? 0.1;
  const maxTokens = options?.maxTokens ?? DEFAULT_MAX_TOKENS;

  const modelsToTry = [primary, ...VISION_FALLBACK_MODELS.filter((m) => m !== primary)];
  let lastError: unknown;

  for (const model of modelsToTry) {
    try {
      const result = await generateText({
        model,
        temperature,
        maxOutputTokens: maxTokens,
        messages: [
          {
            role: "user",
            content: [
              { type: "text", text: prompt },
              { type: "image", image },
            ],
          },
        ],
      });
      return result.text;
    } catch (err) {
      lastError = err;
      logger.warn(`[ai] vision falling back from [${getModelId(model)}]: ${(err as Error)?.message}`);
    }
  }
  throw lastError ?? new Error("AI vision generation exhausted all providers");
}

export const ai = { generate, generateFromImage, streamText, getModelForFeature };
export { MODELS, DEFAULT_MODEL } from "./models.js";
export { openrouter } from "./provider.js";
