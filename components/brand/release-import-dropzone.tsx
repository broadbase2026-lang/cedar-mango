'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';

type ImportResult = {
  title: string;
  bodyHtml: string;
  industry_vertical: string | null;
  tags: string[];
};

const STORAGE_KEY = 'bb_release_import_prefill_v1';

/** Shown in sequence while Gemini processes the upload (single request — steps are indicative). */
const GEMINI_SCAN_STEPS = [
  'Sending document to Gemini…',
  'Scanning pages and layout…',
  'Extracting title, body, vertical, and tags…',
  'Normalizing rich text for the editor…',
  'Finishing up…',
] as const;

async function readJsonSafely(res: Response): Promise<any> {
  const ct = res.headers.get('content-type') ?? '';
  const text = await res.text();
  if (ct.includes('application/json')) {
    try {
      return JSON.parse(text);
    } catch {
      return null;
    }
  }
  // HTML or something else.
  return { __nonJson: true, __text: text };
}

function isAllowedFile(file: File): boolean {
  const name = file.name.toLowerCase();
  if (name.endsWith('.pdf')) return true;
  if (name.endsWith('.docx')) return true;
  return false;
}

function niceBytes(bytes: number): string {
  if (!Number.isFinite(bytes) || bytes <= 0) return '0 B';
  const units = ['B', 'KB', 'MB', 'GB'] as const;
  const idx = Math.min(units.length - 1, Math.floor(Math.log(bytes) / Math.log(1024)));
  const n = bytes / Math.pow(1024, idx);
  return `${n.toFixed(n >= 10 || idx === 0 ? 0 : 1)} ${units[idx]}`;
}

function dragHasFiles(e: DragEvent | React.DragEvent): boolean {
  const dt = e.dataTransfer;
  if (!dt) return false;
  // Finder → Chrome on macOS can be inconsistent about `types` during dragenter/dragover.
  // Use a few heuristics.
  if (dt.files && dt.files.length > 0) return true;
  const items = Array.from(dt.items ?? []);
  if (items.some((it) => it.kind === 'file')) return true;
  const types = Array.from(dt.types ?? []);
  return types.includes('Files');
}

export function ReleaseImportDropzone() {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const dropRef = useRef<HTMLDivElement>(null);
  const [dragOver, setDragOver] = useState(false);
  const [pending, setPending] = useState(false);
  const [geminiScanStep, setGeminiScanStep] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [lastFile, setLastFile] = useState<{ name: string; size: number } | null>(
    null
  );

  useEffect(() => {
    if (!pending) {
      setGeminiScanStep(0);
      return;
    }
    const tickMs = 2300;
    const id = window.setInterval(() => {
      setGeminiScanStep((i) =>
        i >= GEMINI_SCAN_STEPS.length - 1 ? GEMINI_SCAN_STEPS.length - 1 : i + 1
      );
    }, tickMs);
    return () => window.clearInterval(id);
  }, [pending]);

  const helper = useMemo(() => {
    if (pending) {
      const step = GEMINI_SCAN_STEPS[geminiScanStep] ?? GEMINI_SCAN_STEPS[0];
      const n = geminiScanStep + 1;
      const total = GEMINI_SCAN_STEPS.length;
      return `${step} (${n}/${total})`;
    }
    if (error) return error;
    if (lastFile) return `Last: ${lastFile.name} (${niceBytes(lastFile.size)})`;
    return 'Drop a .docx or .pdf here — we’ll extract title, rich text body, vertical, and tags.';
  }, [pending, geminiScanStep, error, lastFile]);

  const onPick = useCallback(() => {
    if (pending) return;
    inputRef.current?.click();
  }, [pending]);

  const runImport = useCallback(
    async (file: File) => {
      setError(null);
      setGeminiScanStep(0);
      setPending(true);
      setLastFile({ name: file.name, size: file.size });
      try {
        if (!isAllowedFile(file)) {
          setError('Only .docx or .pdf files are supported.');
          return;
        }
        // 15MB: keeps requests snappy and avoids accidental multi-hundred-page PDFs.
        if (file.size > 15 * 1024 * 1024) {
          setError('File too large (max 15MB).');
          return;
        }

        const fd = new FormData();
        fd.set('file', file);
        const res = await fetch('/api/ai/release-import', { method: 'POST', body: fd });
        const json = (await readJsonSafely(res)) as
          | { ok: true; result: ImportResult }
          | { ok: false; error: string; retryAfterSeconds?: number | null }
          | { __nonJson: true; __text: string }
          | null;

        if (json && typeof json === 'object' && '__nonJson' in json) {
          // Most commonly: redirected login page or Next error page.
          setError(
            res.status === 401 || res.status === 403
              ? 'You must be signed in to import a release.'
              : `Import failed (received non-JSON response, status ${res.status}).`
          );
          return;
        }

        if (!json) {
          setError(`Import failed (invalid JSON, status ${res.status}).`);
          return;
        }
        if (!res.ok || !json || json.ok !== true) {
          if (res.status === 429) {
            const retry =
              typeof (json as any)?.retryAfterSeconds === 'number'
                ? Math.max(1, Math.round((json as any).retryAfterSeconds))
                : null;
            setError(
              retry
                ? `AI quota exceeded. Retry in ~${retry}s (or enable billing for Gemini).`
                : 'AI quota exceeded (enable billing for Gemini or retry shortly).'
            );
            return;
          }
          setError(
            'error' in json && typeof json.error === 'string'
              ? json.error
              : `Import failed (${res.status}).`
          );
          return;
        }

        sessionStorage.setItem(STORAGE_KEY, JSON.stringify(json.result));
        router.push('/brand/releases/new?prefill=1');
      } catch (e: any) {
        setError(e?.message ?? 'Import failed.');
      } finally {
        setPending(false);
      }
    },
    [router]
  );

  useEffect(() => {
    // Some environments (notably dragging from Finder) won't reliably trigger
    // element-level drag events unless the page prevents default drag behavior.
    function eventTargetsDropzone(e: DragEvent): boolean {
      const t = e.target as Node | null;
      return !!(t && dropRef.current && dropRef.current.contains(t));
    }

    function onDocDragEnter(e: DragEvent) {
      // Chrome (macOS) can treat file drags as a navigation unless default is prevented
      // at the document level. Be permissive here; do not stopPropagation.
      if (!e.dataTransfer) return;
      e.preventDefault();
    }

    function onDocDragOver(e: DragEvent) {
      if (!e.dataTransfer) return;
      // Prevent the browser from treating this as a "navigate/open file" action.
      e.preventDefault();
    }

    function onDocDrop(e: DragEvent) {
      if (!e.dataTransfer) return;
      // Always prevent Chrome's default "open file" navigation.
      // IMPORTANT: do NOT stopPropagation here, otherwise the dropzone's onDrop won't fire.
      e.preventDefault();
      setDragOver(false);
    }

    // Use capture so we win before Chrome's default "open file" navigation.
    document.addEventListener('dragenter', onDocDragEnter, true);
    document.addEventListener('dragover', onDocDragOver, true);
    document.addEventListener('drop', onDocDrop, true);
    // Some Chrome + macOS combos appear to bypass `document` listeners depending on target;
    // register on window + <html> as well for redundancy.
    window.addEventListener('dragenter', onDocDragEnter, true);
    window.addEventListener('dragover', onDocDragOver, true);
    window.addEventListener('drop', onDocDrop, true);
    document.documentElement.addEventListener('dragenter', onDocDragEnter, true);
    document.documentElement.addEventListener('dragover', onDocDragOver, true);
    document.documentElement.addEventListener('drop', onDocDrop, true);
    return () => {
      document.removeEventListener('dragenter', onDocDragEnter, true);
      document.removeEventListener('dragover', onDocDragOver, true);
      document.removeEventListener('drop', onDocDrop, true);
      window.removeEventListener('dragenter', onDocDragEnter, true);
      window.removeEventListener('dragover', onDocDragOver, true);
      window.removeEventListener('drop', onDocDrop, true);
      document.documentElement.removeEventListener('dragenter', onDocDragEnter, true);
      document.documentElement.removeEventListener('dragover', onDocDragOver, true);
      document.documentElement.removeEventListener('drop', onDocDrop, true);
    };
  }, []);

  return (
    <div className="rounded-xl border border-brand-border bg-white p-4 shadow-sm">
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="text-sm font-semibold text-brand-ink">
            Import a press release (AI)
          </div>
          <div
            className="mt-1 text-sm text-brand-muted"
            role="status"
            aria-live="polite"
            aria-busy={pending}
          >
            {helper}
          </div>
        </div>
        <button
          type="button"
          onClick={onPick}
          disabled={pending}
          className="bb-btn-primary-sm whitespace-nowrap"
        >
          {pending ? 'Scanning…' : 'Choose file'}
        </button>
      </div>

      <div
        ref={dropRef}
        role="button"
        tabIndex={0}
        onClick={onPick}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') onPick();
        }}
        onDragEnter={(e) => {
          e.preventDefault();
          e.stopPropagation();
          if (pending) return;
          if (!dragHasFiles(e)) return;
          setDragOver(true);
        }}
        onDragOver={(e) => {
          e.preventDefault();
          e.stopPropagation();
          if (pending) return;
          if (!dragHasFiles(e)) return;
          e.dataTransfer.dropEffect = 'copy';
          setDragOver(true);
        }}
        onDragLeave={(e) => {
          e.preventDefault();
          e.stopPropagation();
          setDragOver(false);
        }}
        onDrop={(e) => {
          e.preventDefault();
          e.stopPropagation();
          setDragOver(false);
          if (pending) return;
          const file = e.dataTransfer.files?.[0];
          if (!file) return;
          void runImport(file);
        }}
        className={
          'mt-4 rounded-xl border-2 border-dashed px-4 py-6 text-center text-sm ' +
          (dragOver
            ? 'border-brand-ring bg-brand-surface-2 text-brand-ink'
            : 'border-brand-border text-brand-muted hover:border-brand-ring/60')
        }
        aria-disabled={pending}
      >
        Drag &amp; drop a <span className="text-brand-ink">.docx</span> or{' '}
        <span className="text-brand-ink">.pdf</span> to generate a draft
      </div>

      <input
        ref={inputRef}
        type="file"
        className="sr-only"
        accept=".pdf,.docx,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (!file) return;
          e.currentTarget.value = '';
          void runImport(file);
        }}
      />
    </div>
  );
}

