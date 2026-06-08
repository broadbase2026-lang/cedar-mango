import 'server-only';

import {
  GoogleGenerativeAI,
  type GenerativeModel,
  type ModelParams,
} from '@google/generative-ai';
import {
  getGeminiApiKey,
  resolveGeminiModelId,
  type BroadbaseGenerationConfig,
  type GeminiTier,
} from './config';

export class GeminiConfigurationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'GeminiConfigurationError';
  }
}

/**
 * Creates a {@link GoogleGenerativeAI} client. Throws if `GEMINI_API_KEY` is missing.
 * Use only on the server (Route Handlers, Server Actions).
 */
export function createGoogleGenAI(): GoogleGenerativeAI {
  const apiKey = getGeminiApiKey();
  if (!apiKey || apiKey.trim() === '') {
    throw new GeminiConfigurationError(
      'GEMINI_API_KEY is not set. Add it to the server environment.'
    );
  }
  return new GoogleGenerativeAI(apiKey);
}

/**
 * Optional client for health checks or graceful degradation.
 */
export function tryCreateGoogleGenAI(): GoogleGenerativeAI | null {
  const apiKey = getGeminiApiKey();
  if (!apiKey || apiKey.trim() === '') {
    return null;
  }
  return new GoogleGenerativeAI(apiKey);
}

export type GetGenerativeModelOptions = Omit<ModelParams, 'model' | 'generationConfig'> & {
  /** Defaults to flash (latency/cost). Use `pro` for heavier reasoning. */
  tier?: GeminiTier;
  generationConfig?: BroadbaseGenerationConfig;
};

/**
 * Returns a {@link GenerativeModel} with optional system instruction and tools.
 */
export function getGeminiGenerativeModel(
  options: GetGenerativeModelOptions = {}
): GenerativeModel {
  const { tier = 'flash', ...modelParams } = options;
  const modelId = resolveGeminiModelId(tier);
  const genAI = createGoogleGenAI();
  return genAI.getGenerativeModel({
    model: modelId,
    ...modelParams,
  });
}
