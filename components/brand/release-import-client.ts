export type ReleaseImportResult = {
  title: string;
  summary: string | null;
  bodyHtml: string;
  industry_vertical: string | null;
  tags: string[];
};

async function readJsonSafely(res: Response): Promise<unknown> {
  const ct = res.headers.get('content-type') ?? '';
  const text = await res.text();
  if (ct.includes('application/json')) {
    try {
      return JSON.parse(text);
    } catch {
      return null;
    }
  }
  return { __nonJson: true, __text: text };
}

function importErrorMessage(
  res: Response,
  json: { error?: string; retryAfterSeconds?: number | null } | null
): string {
  if (res.status === 429) {
    const retry =
      typeof json?.retryAfterSeconds === 'number'
        ? Math.max(1, Math.round(json.retryAfterSeconds))
        : null;
    return retry
      ? `AI quota exceeded. Retry in ~${retry}s (or enable billing for Gemini).`
      : 'AI quota exceeded (enable billing for Gemini or retry shortly).';
  }
  if (res.status === 401 || res.status === 403) {
    return 'You must be signed in to import a release.';
  }
  return typeof json?.error === 'string'
    ? json.error
    : `Import failed (${res.status}).`;
}

export async function importReleaseFromFile(
  file: File
): Promise<ReleaseImportResult> {
  const fd = new FormData();
  fd.set('file', file);
  const res = await fetch('/api/ai/release-import', { method: 'POST', body: fd });
  const json = (await readJsonSafely(res)) as
    | { ok: true; result: ReleaseImportResult }
    | { ok: false; error: string; retryAfterSeconds?: number | null }
    | { __nonJson: true }
    | null;

  if (json && typeof json === 'object' && '__nonJson' in json) {
    throw new Error(importErrorMessage(res, null));
  }
  if (!json || json.ok !== true) {
    throw new Error(importErrorMessage(res, json));
  }
  return json.result;
}

export async function importReleaseFromUrl(
  url: string
): Promise<ReleaseImportResult> {
  const trimmed = url.trim();
  if (!trimmed) {
    throw new Error('Enter a URL to import.');
  }

  const fd = new FormData();
  fd.set('url', trimmed);
  const res = await fetch('/api/ai/release-import', { method: 'POST', body: fd });
  const json = (await readJsonSafely(res)) as
    | { ok: true; result: ReleaseImportResult }
    | { ok: false; error: string; retryAfterSeconds?: number | null }
    | { __nonJson: true }
    | null;

  if (json && typeof json === 'object' && '__nonJson' in json) {
    throw new Error(importErrorMessage(res, null));
  }
  if (!json || json.ok !== true) {
    throw new Error(importErrorMessage(res, json));
  }
  return json.result;
}
