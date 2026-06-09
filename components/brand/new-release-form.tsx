'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { RichTextEditor } from '@/components/rich-text/rich-text-editor';
import { compressImageForUpload } from '@/lib/utils/compressImage';
import { isImageFile } from '@/lib/utils/image-file';
import {
  MAX_IMAGES_PER_PRESS_RELEASE,
  MAX_IMAGE_UPLOAD_BYTES,
} from '@/lib/constants/uploads';
import {
  importReleaseFromFile,
  importReleaseFromUrl,
  type ReleaseImportResult,
} from '@/components/brand/release-import-client';
import { ReleaseFileImportDropzone } from '@/components/brand/release-file-import-dropzone';
import { ReleaseUrlImportField } from '@/components/brand/release-url-import-field';
import { validateReleaseImportFile } from '@/lib/brand/release-import-files';

const STORAGE_KEY = 'bb_release_import_prefill_v1';

type PendingAsset = {
  path: string;
  publicUrl: string;
  fileName: string;
  fileSizeBytes: number;
};

type Prefill = {
  title: string;
  summary: string | null;
  bodyHtml: string;
  industry_vertical: string | null;
  tags: string[];
};

type ExistingRelease = {
  id: string;
  title: string;
  summary: string | null;
  bodyHtml: string;
  industry_vertical: string | null;
  tags: string[];
};

function safeParsePrefill(raw: string | null): Prefill | null {
  if (!raw) return null;
  try {
    const j = JSON.parse(raw) as Partial<Prefill>;
    const title = typeof j.title === 'string' ? j.title.trim() : '';
    const bodyHtml = typeof j.bodyHtml === 'string' ? j.bodyHtml : '';
    const summary =
      typeof j.summary === 'string' && j.summary.trim() ? j.summary.trim() : null;
    const industry_vertical =
      typeof j.industry_vertical === 'string' && j.industry_vertical.trim()
        ? j.industry_vertical.trim()
        : null;
    const tags = Array.isArray(j.tags)
      ? j.tags
          .map((t) => (typeof t === 'string' ? t.trim() : ''))
          .filter(Boolean)
          .slice(0, 12)
      : [];
    if (!title && !bodyHtml) return null;
    return { title, summary, bodyHtml, industry_vertical, tags };
  } catch {
    return null;
  }
}

function formatBytes(n: number): string {
  if (!Number.isFinite(n) || n <= 0) return '0 B';
  const units = ['B', 'KB', 'MB'] as const;
  const i = Math.min(units.length - 1, Math.floor(Math.log(n) / Math.log(1024)));
  const v = n / Math.pow(1024, i);
  return `${v >= 10 || i === 0 ? v.toFixed(0) : v.toFixed(1)} ${units[i]}`;
}

function dragHasFiles(e: React.DragEvent): boolean {
  const dt = e.dataTransfer;
  if (!dt) return false;
  if (dt.files && dt.files.length > 0) return true;
  return Array.from(dt.items ?? []).some((it) => it.kind === 'file');
}

export function NewReleaseForm({
  action,
  brandId,
  errorCode,
  maxPendingImages = MAX_IMAGES_PER_PRESS_RELEASE,
  existing,
}: {
  action: (formData: FormData) => Promise<void>;
  brandId: string;
  errorCode?: string | null;
  maxPendingImages?: number;
  existing?: ExistingRelease | null;
}) {
  const formRef = useRef<HTMLFormElement>(null);
  const imageInputRef = useRef<HTMLInputElement>(null);
  const [title, setTitle] = useState('');
  const [summary, setSummary] = useState('');
  const [vertical, setVertical] = useState<string>('');
  const [tags, setTags] = useState('');
  const [bodyHtml, setBodyHtml] = useState('');
  const [editorSeed, setEditorSeed] = useState(0);
  const [summaryBusy, setSummaryBusy] = useState(false);
  const [summaryErr, setSummaryErr] = useState<string | null>(null);
  const [pendingAssets, setPendingAssets] = useState<PendingAsset[]>([]);
  const [imageBusy, setImageBusy] = useState(false);
  const [imageErr, setImageErr] = useState<string | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const [importBusy, setImportBusy] = useState(false);
  const [importErr, setImportErr] = useState<string | null>(null);
  const pendingAssetsRef = useRef<PendingAsset[]>([]);

  const applyImportResult = useCallback((result: ReleaseImportResult) => {
    setTitle(result.title || '');
    setSummary(result.summary || '');
    setBodyHtml(result.bodyHtml || '');
    setVertical(result.industry_vertical ?? '');
    setTags(result.tags.join(','));
    setEditorSeed((x) => x + 1);
  }, []);

  useEffect(() => {
    pendingAssetsRef.current = pendingAssets;
  }, [pendingAssets]);

  useEffect(() => {
    if (!existing?.id) return;
    // Editing an existing draft: server-provided values win over any stale import prefill.
    setTitle(existing.title || '');
    setSummary(existing.summary || '');
    setBodyHtml(existing.bodyHtml || '');
    setVertical(existing.industry_vertical ?? '');
    setTags((existing.tags ?? []).join(','));
    setEditorSeed((x) => x + 1);
  }, [
    existing?.id,
    existing?.title,
    existing?.summary,
    existing?.bodyHtml,
    existing?.industry_vertical,
    existing?.tags,
  ]);

  useEffect(() => {
    if (existing?.id) return;
    const prefill = safeParsePrefill(sessionStorage.getItem(STORAGE_KEY));
    if (!prefill) return;
    // Do NOT remove here. In React 18 dev (Strict Mode), components can mount twice,
    // which would clear the prefill before the "real" mount reads it, leaving fields blank.
    setTitle(prefill.title || '');
    setSummary(prefill.summary || '');
    setBodyHtml(prefill.bodyHtml || '');
    setVertical(prefill.industry_vertical ?? '');
    setTags(prefill.tags.join(','));
    setEditorSeed((x) => x + 1); // forces TipTap to re-init with imported HTML
  }, [existing?.id]);

  const onImportFromUrl = useCallback(
    async (url: string) => {
      setImportErr(null);
      setImportBusy(true);
      try {
        const result = await importReleaseFromUrl(url);
        applyImportResult(result);
      } catch (e) {
        setImportErr(e instanceof Error ? e.message : 'Import failed.');
      } finally {
        setImportBusy(false);
      }
    },
    [applyImportResult]
  );

  const onImportFromFile = useCallback(
    async (file: File) => {
      setImportErr(null);
      const validationError = validateReleaseImportFile(file);
      if (validationError) {
        setImportErr(validationError);
        return;
      }

      setImportBusy(true);
      try {
        const result = await importReleaseFromFile(file);
        applyImportResult(result);
      } catch (e) {
        setImportErr(e instanceof Error ? e.message : 'Import failed.');
      } finally {
        setImportBusy(false);
      }
    },
    [applyImportResult]
  );

  const errorMessage = useMemo(() => {
    if (!errorCode) return null;
    if (errorCode === 'missing_title') return 'Title is required.';
    if (errorCode === 'missing_body') return 'Body is required.';
    if (errorCode === 'body_too_long')
      return 'Body is too long (max 500,000 characters).';
    if (errorCode === 'summary_too_long') return 'Summary must be ≤ 280 characters.';
    if (errorCode === 'invalid_rich_text') return 'Body content was invalid. Try again.';
    if (errorCode === 'create_failed') return 'Could not create the draft. Try again.';
    if (errorCode === 'invalid_pending_assets')
      return 'Uploaded images could not be attached. Remove images and try again.';
    if (errorCode === 'assets_failed')
      return 'Draft may have been created, but linking images failed. Add them from Media Library.';
    return 'Something went wrong. Try again.';
  }, [errorCode]);

  const onGenerateSummary = useCallback(async () => {
    setSummaryErr(null);
    const titleVal = title.trim();
    const bodyVal = bodyHtml.trim();

    if (!titleVal && !bodyVal) {
      setSummaryErr('Add a title or body first.');
      return;
    }

    setSummaryBusy(true);
    try {
      const res = await fetch('/api/ai/release-summary', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: titleVal, bodyHtml: bodyVal }),
      });
      const json = (await res.json().catch(() => null)) as
        | { ok: true; summary: string }
        | { ok: false; error: string; retryAfterSeconds?: number | null }
        | null;

      if (!json || json.ok !== true) {
        const msg =
          json && 'error' in json
            ? json.error
            : `Could not generate summary (${res.status}).`;
        setSummaryErr(msg);
        return;
      }
      setSummary(json.summary);
    } catch {
      setSummaryErr('Network error. Try again.');
    } finally {
      setSummaryBusy(false);
    }
  }, [title, bodyHtml]);

  const processImageFiles = useCallback(
    async (files: FileList | File[]) => {
      const list = Array.from(files).filter(isImageFile);
      if (list.length === 0) {
        setImageErr('Drop image files only (JPEG, PNG, WebP, etc.).');
        return;
      }
      setImageErr(null);
      setImageBusy(true);
      try {
        let acc = [...pendingAssetsRef.current];
        for (const raw of list) {
          if (acc.length >= maxPendingImages) {
            setImageErr(`Maximum ${maxPendingImages} images per draft.`);
            break;
          }
          if (raw.size > MAX_IMAGE_UPLOAD_BYTES) {
            setImageErr(
              `Skipped ${raw.name} (over ${MAX_IMAGE_UPLOAD_BYTES / (1024 * 1024)}MB before compression).`
            );
            continue;
          }
          const prepared = await compressImageForUpload(raw);
          const fd = new FormData();
          fd.set('brandId', brandId);
          fd.set('file', prepared);
          const res = await fetch('/api/storage/press-assets-public/upload', {
            method: 'POST',
            body: fd,
          });
          const json = (await res.json().catch(() => null)) as
            | { ok: true; path: string; publicUrl: string; size?: number }
            | { error: string }
            | null;
          if (!res.ok || !json || !('ok' in json) || json.ok !== true) {
            setImageErr(
              json && 'error' in json ? json.error : `Upload failed (${res.status}).`
            );
            break;
          }
          const row: PendingAsset = {
            path: json.path,
            publicUrl: json.publicUrl,
            fileName: prepared.name,
            fileSizeBytes: json.size ?? prepared.size,
          };
          acc = [...acc, row];
          pendingAssetsRef.current = acc;
          setPendingAssets(acc);
        }
      } catch (e) {
        setImageErr(e instanceof Error ? e.message : 'Upload failed.');
      } finally {
        setImageBusy(false);
      }
    },
    [brandId, maxPendingImages]
  );

  const removePendingAsset = useCallback((path: string) => {
    setPendingAssets((prev) => prev.filter((a) => a.path !== path));
  }, []);

  return (
    <form
      ref={formRef}
      action={action}
      className="rounded-xl border border-brand-border bg-white p-6 shadow-sm space-y-4"
    >
      {errorMessage && (
        <div
          className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800"
          role="status"
        >
          {errorMessage}
        </div>
      )}

      {!existing?.id ? (
        <div className="rounded-xl border border-brand-border bg-brand-surface-2/40 p-4 space-y-4">
          <div>
            <div className="text-sm font-semibold text-brand-ink">
              Import a press release (AI)
            </div>
            <p className="mt-1 text-xs text-brand-muted">
              Drop a file or paste a URL. Gemini fills title, summary or subhead, body,
              vertical, and tags below.
            </p>
          </div>

          <ReleaseFileImportDropzone
            pending={importBusy}
            onFile={onImportFromFile}
          />

          <div>
            <p className="mb-2 text-xs text-brand-muted">Or import from a web page URL</p>
            <ReleaseUrlImportField pending={importBusy} onImport={onImportFromUrl} />
          </div>

          {importErr ? (
            <p className="text-xs text-red-600" role="alert">
              {importErr}
            </p>
          ) : null}
        </div>
      ) : null}

      <div className="space-y-1">
        <label
          className="mb-1.5 block text-xs font-medium uppercase tracking-wide text-brand-muted"
          htmlFor="title"
        >
          Title
        </label>
        <input
          id="title"
          name="title"
          required
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="e.g. Acme Hotel opens in Singapore"
          className="flex h-11 w-full rounded-xl bg-white px-4 text-sm text-brand-ink ring-1 ring-inset ring-brand-border shadow-sm placeholder:text-brand-muted/80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-ring"
        />
      </div>

      {existing?.id ? (
        <input type="hidden" name="release_id" value={existing.id} />
      ) : null}

      <input type="hidden" name="pending_assets" value={JSON.stringify(pendingAssets)} />

      <div className="space-y-1">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <label
            className="mb-1.5 block text-xs font-medium uppercase tracking-wide text-brand-muted"
            htmlFor="summary"
          >
            Summary (optional)
          </label>
          <button
            type="button"
            onClick={onGenerateSummary}
            disabled={summaryBusy}
            className="bb-btn-primary-sm shrink-0 bg-white text-brand-ink ring-1 ring-inset ring-brand-border hover:bg-brand-surface-2 disabled:opacity-60"
          >
            {summaryBusy ? 'Generating…' : 'Summarize with AI'}
          </button>
        </div>
        <textarea
          id="summary"
          name="summary"
          rows={3}
          value={summary}
          onChange={(e) => setSummary(e.target.value)}
          maxLength={280}
          className="flex w-full rounded-xl bg-white px-4 py-3 text-sm text-brand-ink ring-1 ring-inset ring-brand-border shadow-sm placeholder:text-brand-muted/80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-ring"
          placeholder="280 chars max. Used in digests and previews."
        />
        <div className="flex justify-between text-xs text-brand-muted">
          <span>{summaryErr ? <span className="text-red-600">{summaryErr}</span> : null}</span>
          <span className="tabular-nums">{summary.length}/280</span>
        </div>
      </div>

      <div className="space-y-1">
        <label
          className="mb-1.5 block text-xs font-medium uppercase tracking-wide text-brand-muted"
          htmlFor="body"
        >
          Body
        </label>
        <div id="body">
          <RichTextEditor
            key={editorSeed}
            name="body"
            required
            defaultValue={bodyHtml}
            onChange={setBodyHtml}
          />
        </div>
      </div>

      <div className="space-y-1">
        <div className="mb-1.5 text-xs font-medium uppercase tracking-wide text-brand-muted">
          Press images (optional)
        </div>
        <div
          className={`rounded-xl border-2 border-dashed px-4 py-8 text-center transition-colors ${
            dragOver
              ? 'border-brand-primary-600 bg-brand-surface-2'
              : 'border-brand-border bg-white'
          }`}
          onDragEnter={(e) => {
            e.preventDefault();
            e.stopPropagation();
            if (dragHasFiles(e)) setDragOver(true);
          }}
          onDragOver={(e) => {
            e.preventDefault();
            e.stopPropagation();
            if (dragHasFiles(e)) setDragOver(true);
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
            if (imageBusy) return;
            void processImageFiles(e.dataTransfer.files);
          }}
        >
          <input
            ref={imageInputRef}
            type="file"
            accept="image/*"
            multiple
            className="hidden"
            onChange={(e) => {
              const f = e.target.files;
              if (f?.length) void processImageFiles(f);
              e.target.value = '';
            }}
          />
          <p className="text-sm text-brand-ink">
            {imageBusy ? 'Compressing and uploading…' : 'Drag images here or '}
            {!imageBusy ? (
              <button
                type="button"
                className="font-medium text-brand-primary-700 underline-offset-2 hover:underline"
                onClick={() => imageInputRef.current?.click()}
              >
                browse
              </button>
            ) : null}
          </p>
          <p className="mt-1 text-xs text-brand-muted">
            Up to {maxPendingImages} images, {MAX_IMAGE_UPLOAD_BYTES / (1024 * 1024)}MB each before
            compression. Images are resized as JPEG (max edge 2048px).
          </p>
          {imageErr ? <p className="mt-2 text-xs text-red-600">{imageErr}</p> : null}
        </div>
        {pendingAssets.length > 0 ? (
          <ul className="mt-2 grid gap-2 sm:grid-cols-2">
            {pendingAssets.map((a) => (
              <li
                key={a.path}
                className="flex items-center gap-3 rounded-lg border border-brand-border bg-brand-surface-2/60 p-2 pr-3"
              >
                {/* eslint-disable-next-line @next/next/no-img-element -- dynamic Supabase public URLs */}
                <img
                  src={a.publicUrl}
                  alt=""
                  className="h-14 w-14 shrink-0 rounded-md object-cover ring-1 ring-inset ring-brand-border"
                />
                <div className="min-w-0 flex-1">
                  <div className="truncate text-xs font-medium text-brand-ink">{a.fileName}</div>
                  <div className="text-[11px] text-brand-muted">{formatBytes(a.fileSizeBytes)}</div>
                </div>
                <button
                  type="button"
                  className="shrink-0 rounded-md px-2 py-1 text-xs text-brand-muted ring-1 ring-inset ring-brand-border hover:bg-white"
                  onClick={() => removePendingAsset(a.path)}
                  aria-label={`Remove ${a.fileName}`}
                >
                  Remove
                </button>
              </li>
            ))}
          </ul>
        ) : null}
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-1">
          <label
            className="mb-1.5 block text-xs font-medium uppercase tracking-wide text-brand-muted"
            htmlFor="industry_vertical"
          >
            Vertical (optional)
          </label>
          <select
            id="industry_vertical"
            name="industry_vertical"
            className="flex h-11 w-full rounded-xl bg-white px-4 text-sm text-brand-ink ring-1 ring-inset ring-brand-border shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-ring"
            value={vertical}
            onChange={(e) => setVertical(e.target.value)}
          >
            <option value="">—</option>
            <option value="fnb">F&amp;B</option>
            <option value="travel">Travel</option>
            <option value="culture">Culture</option>
            <option value="fashion">Fashion</option>
            <option value="lifestyle">Lifestyle</option>
            <option value="other">Other</option>
          </select>
        </div>
        <div className="space-y-1">
          <label
            className="mb-1.5 block text-xs font-medium uppercase tracking-wide text-brand-muted"
            htmlFor="tags"
          >
            Tags (optional)
          </label>
          <input
            id="tags"
            name="tags"
            value={tags}
            onChange={(e) => setTags(e.target.value)}
            placeholder="comma,separated,tags"
            className="flex h-11 w-full rounded-xl bg-white px-4 text-sm text-brand-ink ring-1 ring-inset ring-brand-border shadow-sm placeholder:text-brand-muted/80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-ring"
          />
        </div>
      </div>

      <div className="pt-2">
        <button type="submit" className="bb-btn-primary-sm no-underline">
          {existing?.id ? 'Save changes' : 'Create draft'}
        </button>
      </div>
    </form>
  );
}

