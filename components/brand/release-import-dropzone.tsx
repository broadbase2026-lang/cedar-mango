'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  importReleaseFromFile,
  importReleaseFromUrl,
  type ReleaseImportResult,
} from '@/components/brand/release-import-client';
import { ReleaseFileImportDropzone } from '@/components/brand/release-file-import-dropzone';
import { ReleaseUrlImportField } from '@/components/brand/release-url-import-field';
import {
  RELEASE_IMPORT_FORMATS_LABEL,
  validateReleaseImportFile,
} from '@/lib/brand/release-import-files';

const STORAGE_KEY = 'bb_release_import_prefill_v1';

const GEMINI_SCAN_STEPS = [
  'Sending content to Gemini…',
  'Scanning document or page layout…',
  'Extracting title, summary, body, vertical, and tags…',
  'Normalizing rich text for the editor…',
  'Finishing up…',
] as const;

function niceBytes(bytes: number): string {
  if (!Number.isFinite(bytes) || bytes <= 0) return '0 B';
  const units = ['B', 'KB', 'MB', 'GB'] as const;
  const idx = Math.min(units.length - 1, Math.floor(Math.log(bytes) / Math.log(1024)));
  const n = bytes / Math.pow(1024, idx);
  return `${n.toFixed(n >= 10 || idx === 0 ? 0 : 1)} ${units[idx]}`;
}

function storePrefillAndGo(router: ReturnType<typeof useRouter>, result: ReleaseImportResult) {
  sessionStorage.setItem(STORAGE_KEY, JSON.stringify(result));
  router.push('/brand/releases/new?prefill=1');
}

export function ReleaseImportDropzone() {
  const router = useRouter();
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
    return `Drop a file (${RELEASE_IMPORT_FORMATS_LABEL}) or paste a URL — we’ll extract title, summary, body, vertical, and tags.`;
  }, [pending, geminiScanStep, error, lastFile]);

  const runImport = useCallback(
    async (file: File) => {
      setError(null);
      setGeminiScanStep(0);
      const validationError = validateReleaseImportFile(file);
      if (validationError) {
        setError(validationError);
        return;
      }

      setPending(true);
      setLastFile({ name: file.name, size: file.size });
      try {
        const result = await importReleaseFromFile(file);
        storePrefillAndGo(router, result);
      } catch (e: unknown) {
        setError(e instanceof Error ? e.message : 'Import failed.');
      } finally {
        setPending(false);
      }
    },
    [router]
  );

  const runUrlImport = useCallback(
    async (url: string) => {
      setError(null);
      setGeminiScanStep(0);
      setPending(true);
      setLastFile(null);
      try {
        const result = await importReleaseFromUrl(url);
        storePrefillAndGo(router, result);
      } catch (e: unknown) {
        setError(e instanceof Error ? e.message : 'Import failed.');
      } finally {
        setPending(false);
      }
    },
    [router]
  );

  return (
    <div className="rounded-xl border border-brand-border bg-white p-4 shadow-sm">
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

      <ReleaseFileImportDropzone
        className="mt-4"
        pending={pending}
        onFile={runImport}
        guardDocumentDrop
      />

      <div className="mt-4">
        <p className="mb-2 text-xs text-brand-muted">Or import from a web page URL</p>
        <ReleaseUrlImportField pending={pending} onImport={runUrlImport} />
      </div>
    </div>
  );
}
