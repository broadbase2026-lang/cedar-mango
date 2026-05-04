/**
 * Gemini model identifiers. Override via env when Google renames or promotes models.
 * `gemini-2.0-pro` is available in Hong Kong (APAC); confirm for other regions if needed.
 * @see https://ai.google.dev/gemini-api/docs/models/gemini
 */
export const DEFAULT_GEMINI_FLASH_MODEL = 'gemini-2.0-flash' as const;
export const DEFAULT_GEMINI_PRO_MODEL = 'gemini-2.0-pro' as const;

export type GeminiTier = 'flash' | 'pro';

export function resolveGeminiModelId(tier: GeminiTier): string {
  const flash =
    process.env.GEMINI_MODEL_FLASH ?? DEFAULT_GEMINI_FLASH_MODEL;
  const pro = process.env.GEMINI_MODEL_PRO ?? DEFAULT_GEMINI_PRO_MODEL;
  return tier === 'flash' ? flash : pro;
}

export function getGeminiApiKey(): string | undefined {
  return process.env.GEMINI_API_KEY;
}
