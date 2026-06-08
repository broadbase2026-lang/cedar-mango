export function extractRetryAfterSeconds(message: string): number | null {
  // Google error payload often includes RetryInfo: retryDelay:"47s"
  const m = message.match(/retryDelay"\s*:\s*"(\d+)s"/i);
  if (!m) return null;
  const n = Number(m[1]);
  return Number.isFinite(n) && n > 0 ? n : null;
}

export function isGeminiQuotaError(message: string): boolean {
  const s = message ?? '';
  return (
    s.includes('[429') ||
    s.includes('429 Too Many Requests') ||
    s.toLowerCase().includes('quota exceeded')
  );
}

export function isGeminiUnsupportedLocationError(message: string): boolean {
  const s = (message ?? '').toLowerCase();
  return (
    s.includes('user location is not supported for the api use') ||
    (s.includes('location') && s.includes('not supported') && s.includes('api use'))
  );
}

export function geminiUnsupportedLocationUserMessage(): string {
  return [
    'Gemini API rejected this request because the server location/IP is not supported.',
    'To fix: run the API from a supported region (or deploy via a supported region), or switch to Vertex AI Gemini.',
  ].join(' ');
}

