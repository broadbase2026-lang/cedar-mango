/**
 * Vertex AI platform settings (Application Default Credentials).
 *
 * @see https://cloud.google.com/vertex-ai/docs/authentication
 */

export const VERTEX_GEMINI_15_FLASH_MODEL = 'gemini-1.5-flash' as const;

const DEFAULT_VERTEX_LOCATION = 'us-central1';

export function getVertexProjectId(): string | undefined {
  return process.env.GOOGLE_CLOUD_PROJECT ?? process.env.GCP_PROJECT;
}

export function getVertexLocation(): string {
  const location =
    process.env.GOOGLE_CLOUD_LOCATION ?? process.env.VERTEX_AI_LOCATION;
  const trimmed = location?.trim();
  return trimmed && trimmed.length > 0 ? trimmed : DEFAULT_VERTEX_LOCATION;
}
