import type { GenerationConfig } from '@google/generative-ai';

/**
 * Gemini model identifiers.
 *
 * This app intentionally locks all Gemini calls to a single model to make
 * performance/cost predictable and avoid accidental upgrades via env overrides.
 * @see https://ai.google.dev/gemini-api/docs/models/gemini
 */
export const DEFAULT_GEMINI_FLASH_MODEL = 'gemini-2.5-flash' as const;
export const DEFAULT_GEMINI_PRO_MODEL = 'gemini-2.5-flash' as const;

export type GeminiTier = 'flash' | 'pro';

export function resolveGeminiModelId(tier: GeminiTier): string {
  // Enforced single-model policy.
  return tier === 'flash' ? DEFAULT_GEMINI_FLASH_MODEL : DEFAULT_GEMINI_PRO_MODEL;
}

export function getGeminiApiKey(): string | undefined {
  return process.env.GEMINI_API_KEY;
}

/** Fields supported by the REST API but not yet in @google/generative-ai typings. */
type GeminiGenerationConfigExtras = {
  thinkingConfig?: { thinkingBudget?: number };
};

export type BroadbaseGenerationConfig = GenerationConfig & GeminiGenerationConfigExtras;

/**
 * Structured JSON calls on Gemini 2.5 Flash.
 *
 * 2.5 models use dynamic thinking by default; thinking tokens count against
 * `maxOutputTokens`, which often truncates JSON to a few characters unless
 * thinking is disabled.
 */
export function geminiJsonGenerationConfig(
  maxOutputTokens: number
): BroadbaseGenerationConfig {
  return {
    responseMimeType: 'application/json',
    maxOutputTokens,
    thinkingConfig: { thinkingBudget: 0 },
  };
}
