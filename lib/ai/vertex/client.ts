import 'server-only';

import {
  VertexAI,
  type GenerateContentResponse,
} from '@google-cloud/vertexai';
import {
  getVertexLocation,
  getVertexProjectId,
  VERTEX_GEMINI_15_FLASH_MODEL,
} from './config';

/**
 * Creates a {@link VertexAI} client authenticated via Application Default
 * Credentials (no explicit service account key file path).
 */
export function createVertexAI(): VertexAI {
  const project = getVertexProjectId()?.trim();

  return new VertexAI({
    ...(project ? { project } : {}),
    location: getVertexLocation(),
  });
}

function extractTextFromGenerateContentResponse(
  response: GenerateContentResponse
): string {
  const parts = response.candidates?.[0]?.content?.parts ?? [];
  const text = parts
    .map((part) => ('text' in part && part.text ? part.text : ''))
    .join('')
    .trim();
  return text;
}

/**
 * Example: send a text prompt to Gemini 1.5 Flash on Vertex AI and return the
 * model's text reply.
 */
export async function generateVertexFlashTextResponse(
  prompt: string
): Promise<string> {
  const trimmedPrompt = prompt.trim();
  if (!trimmedPrompt) {
    throw new Error('prompt must be a non-empty string.');
  }

  const vertexAI = createVertexAI();
  const model = vertexAI.getGenerativeModel({
    model: VERTEX_GEMINI_15_FLASH_MODEL,
  });

  const result = await model.generateContent({
    contents: [{ role: 'user', parts: [{ text: trimmedPrompt }] }],
  });

  const text = extractTextFromGenerateContentResponse(result.response);
  if (!text) {
    throw new Error('Vertex AI returned no text in the response.');
  }

  return text;
}
