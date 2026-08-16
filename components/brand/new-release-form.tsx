'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useCallback, useEffect, useMemo, useRef, useState, useTransition } from 'react';
import { softDeleteRelease } from '@/app/(brand)/brand/dashboard/actions';
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
import { registerPressAsset, softDeletePressAsset } from '@/app/(brand)/brand/upload/actions';
import {
  createPressReleaseDraftAction,
  savePressReleaseDraftAction,
} from '@/app/(brand)/brand/releases/new/actions';
import { ReleasePublishPanel } from '@/components/brand/release-publish-panel';
import type { ReleaseImageAsset } from '@/lib/brand/release-asset-model';
import {
  DEFAULT_RELEASES_LIST_HREF,
  editReleaseHref,
} from '@/lib/brand/release-editor-url';
import { TRIAL_LIMIT_COPY } from '@/constants/copy';
import { TRIAL_RELEASE_LIMIT_ERROR_CODE } from '@/lib/brand/trial-release-limit';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';

const STORAGE_KEY = 'bb_release_import_prefill_v1';

type PendingAsset = ReleaseImageAsset;

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
  imageLink: string | null;
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

function releaseFormErrorMessage(errorCode: string | null | undefined): string | null {
  if (!errorCode) return null;
  if (errorCode === 'missing_title') return 'Title is required.';
  if (errorCode === 'missing_body') return 'Body is required.';
  if (errorCode === 'body_too_long')
    return 'Body is too long (max 500,000 characters).';
  if (errorCode === 'summary_too_long') return 'Summary must be ≤ 280 characters.';
  if (errorCode === 'invalid_image_link')
    return 'Image link must be a valid http(s) URL.';
  if (errorCode === 'invalid_rich_text') return 'Body content was invalid. Try again.';
  if (errorCode === TRIAL_RELEASE_LIMIT_ERROR_CODE) {
    return TRIAL_LIMIT_COPY.errors.createDraftLimit;
  }
  if (errorCode === 'create_failed') return 'Could not save the draft. Try again.';
  if (errorCode === 'invalid_pending_assets')
    return 'Uploaded images could not be attached. Remove images and try again.';
  if (errorCode === 'assets_failed')
    return 'Draft was saved, but linking images failed. Save again or add them from Media Library.';
  if (errorCode === 'not_signed_in') return 'You must be signed in to save.';
  if (errorCode === 'no_brand') return 'Create a brand workspace in settings first.';
  if (errorCode === 'already_published') return 'This release is already published.';
  return 'Something went wrong. Try again.';
}

function dragHasFiles(e: React.DragEvent): boolean {
  const dt = e.dataTransfer;
  if (!dt) return false;
  if (dt.files && dt.files.length > 0) return true;
  return Array.from(dt.items ?? []).some((it) => it.kind === 'file');
}

export function NewReleaseForm({
  brandId,
  errorCode,
  maxPendingImages = MAX_IMAGES_PER_PRESS_RELEASE,
  initialImages = [],
  savedNotice = false,
  existing,
  publishConfig,
  returnTo = DEFAULT_RELEASES_LIST_HREF,
}: {
  brandId: string;
  errorCode?: string | null;
  maxPendingImages?: number;
  initialImages?: ReleaseImageAsset[];
  savedNotice?: boolean;
  existing?: ExistingRelease | null;
  publishConfig?: {
    plan: string | null;
    embargoUntil: string | null;
  } | null;
  /** Dashboard list URL (including page) to return to after publish/delete. */
  returnTo?: string;
}) {
  const router = useRouter();
  const [deletePending, startDeleteTransition] = useTransition();
  // useState (not useTransition): React 18 clears transition pending on the first
  // await, which re-enabled this button while the server action was still running.
  const [submitPending, setSubmitPending] = useState(false);
  const submitLockRef = useRef(false);
  const [localError, setLocalError] = useState<string | null>(null);
  const formRef = useRef<HTMLFormElement>(null);
  const imageInputRef = useRef<HTMLInputElement>(null);
  // Seed from `existing` on first paint so TipTap mounts with body content on cold
  // loads (e.g. Cmd+click new tab). A post-mount hydrate+remount race left body empty.
  const [title, setTitle] = useState(() => existing?.title || '');
  const [summary, setSummary] = useState(() => existing?.summary || '');
  const [imageLink, setImageLink] = useState(() => existing?.imageLink || '');
  const [vertical, setVertical] = useState(() => existing?.industry_vertical ?? '');
  const [tags, setTags] = useState(() => (existing?.tags ?? []).join(','));
  const [bodyHtml, setBodyHtml] = useState(() => existing?.bodyHtml || '');
  const [editorSeed, setEditorSeed] = useState(0);
  const [summaryBusy, setSummaryBusy] = useState(false);
  const [summaryErr, setSummaryErr] = useState<string | null>(null);
  const [pendingAssets, setPendingAssets] = useState<PendingAsset[]>(initialImages);
  const [imageBusy, setImageBusy] = useState(false);
  const [imageErr, setImageErr] = useState<string | null>(null);
  const [imageUrl, setImageUrl] = useState('');
  const [dragOver, setDragOver] = useState(false);
  const [importBusy, setImportBusy] = useState(false);
  const [importErr, setImportErr] = useState<string | null>(null);
  const pendingAssetsRef = useRef<PendingAsset[]>([]);
  const hydratedReleaseIdRef = useRef<string | null>(existing?.id ?? null);

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
    if (!existing?.id) {
      hydratedReleaseIdRef.current = null;
      return;
    }
    // First paint already seeds from `existing`. Re-apply only when the edit target
    // changes (e.g. client nav to another draft). Skip on revalidate so unsaved
    // editor state is not wiped after image uploads.
    if (hydratedReleaseIdRef.current === existing.id) return;
    hydratedReleaseIdRef.current = existing.id;

    setTitle(existing.title || '');
    setSummary(existing.summary || '');
    setImageLink(existing.imageLink || '');
    setBodyHtml(existing.bodyHtml || '');
    setVertical(existing.industry_vertical ?? '');
    setTags((existing.tags ?? []).join(','));
    setPendingAssets(initialImages);
    pendingAssetsRef.current = initialImages;
    setEditorSeed((x) => x + 1);
  }, [existing, initialImages]);

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

  const activeErrorCode = localError ? null : errorCode;
  const errorMessage = useMemo(() => {
    if (localError) return localError;
    if (errorCode === 'create_failed' && !existing?.id) {
      return 'Could not create the draft. Try again.';
    }
    return releaseFormErrorMessage(errorCode);
  }, [localError, errorCode, existing?.id]);

  const buildFormData = useCallback(() => {
    const formData = new FormData();
    if (existing?.id) {
      formData.set('release_id', existing.id);
    }
    formData.set('title', title);
    formData.set('body', bodyHtml);
    formData.set('summary', summary);
    formData.set('image_link', imageLink);
    formData.set('industry_vertical', vertical);
    formData.set('tags', tags);
    formData.set('pending_assets', JSON.stringify(pendingAssets));
    return formData;
  }, [
    existing?.id,
    title,
    bodyHtml,
    summary,
    imageLink,
    vertical,
    tags,
    pendingAssets,
  ]);

  const onFormSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (submitLockRef.current || submitPending || deletePending) return;
    submitLockRef.current = true;
    setSubmitPending(true);
    setLocalError(null);

    void (async () => {
      try {
        const result = existing?.id
          ? await savePressReleaseDraftAction(buildFormData())
          : await createPressReleaseDraftAction(buildFormData());

        if (!result.ok) {
          if (result.errorCode === 'not_signed_in') {
            window.location.assign('/login');
            return;
          }
          if (result.errorCode === 'no_brand') {
            window.location.assign('/brand/settings');
            return;
          }
          setLocalError(releaseFormErrorMessage(result.errorCode));
          submitLockRef.current = false;
          setSubmitPending(false);
          return;
        }

        // Hard navigation: after a server action, Next soft `router.push` often
        // loses to the action's revalidation refresh, so the create form stayed put
        // while another identical draft was inserted on every click.
        window.location.assign(
          editReleaseHref(result.releaseId, { saved: true, next: returnTo })
        );
      } catch {
        setLocalError('Something went wrong. Try again.');
        submitLockRef.current = false;
        setSubmitPending(false);
      }
    })();
  };

  const saveCurrentDraft = useCallback(async (): Promise<
    { ok: true } | { ok: false; message: string }
  > => {
    if (!existing?.id) {
      return { ok: false, message: 'No draft to save.' };
    }

    const result = await savePressReleaseDraftAction(buildFormData());
    if (!result.ok) {
      return {
        ok: false,
        message: releaseFormErrorMessage(result.errorCode) ?? 'Could not save draft.',
      };
    }
    return { ok: true };
  }, [existing?.id, buildFormData]);

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

  const appendUploadedImage = useCallback(
    async (json: {
      path: string;
      publicUrl: string;
      fileName: string;
      size: number;
    }): Promise<boolean> => {
      const row: PendingAsset = {
        path: json.path,
        publicUrl: json.publicUrl,
        fileName: json.fileName,
        fileSizeBytes: json.size,
      };

      if (existing?.id) {
        const reg = await registerPressAsset({
          brandId,
          pressReleaseId: existing.id,
          fileName: row.fileName,
          fileUrl: row.publicUrl,
          fileType: 'image',
          fileSizeBytes: row.fileSizeBytes,
          caption: null,
          isPublic: true,
          isHero: false,
        });
        if (reg.error) {
          setImageErr(reg.error);
          return false;
        }
        if (reg.assetId) {
          row.id = reg.assetId;
        }
      }

      const acc = [...pendingAssetsRef.current, row];
      pendingAssetsRef.current = acc;
      setPendingAssets(acc);
      return true;
    },
    [brandId, existing?.id]
  );

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
        for (const raw of list) {
          if (pendingAssetsRef.current.length >= maxPendingImages) {
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
            | {
                ok: true;
                path: string;
                publicUrl: string;
                size?: number;
                fileName?: string;
              }
            | { error: string }
            | null;
          if (!res.ok || !json || !('ok' in json) || json.ok !== true) {
            setImageErr(
              json && 'error' in json ? json.error : `Upload failed (${res.status}).`
            );
            break;
          }
          const ok = await appendUploadedImage({
            path: json.path,
            publicUrl: json.publicUrl,
            fileName: prepared.name,
            size: json.size ?? prepared.size,
          });
          if (!ok) break;
        }
      } catch (e) {
        setImageErr(e instanceof Error ? e.message : 'Upload failed.');
      } finally {
        setImageBusy(false);
      }
    },
    [brandId, maxPendingImages, appendUploadedImage]
  );

  const onUploadImageFromUrl = useCallback(async () => {
    const trimmed = imageUrl.trim();
    if (!trimmed || imageBusy) return;

    if (pendingAssetsRef.current.length >= maxPendingImages) {
      setImageErr(`Maximum ${maxPendingImages} images per draft.`);
      return;
    }

    setImageErr(null);
    setImageBusy(true);
    try {
      const res = await fetch('/api/storage/press-assets-public/upload-from-url', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ brandId, url: trimmed }),
      });
      const json = (await res.json().catch(() => null)) as
        | {
            ok: true;
            path: string;
            publicUrl: string;
            fileName: string;
            size: number;
          }
        | { error: string }
        | null;
      if (!res.ok || !json || !('ok' in json) || json.ok !== true) {
        setImageErr(
          json && 'error' in json
            ? json.error
            : `Upload from URL failed (${res.status}).`
        );
        return;
      }
      const ok = await appendUploadedImage({
        path: json.path,
        publicUrl: json.publicUrl,
        fileName: json.fileName,
        size: json.size,
      });
      if (ok) setImageUrl('');
    } catch (e) {
      setImageErr(e instanceof Error ? e.message : 'Upload from URL failed.');
    } finally {
      setImageBusy(false);
    }
  }, [imageUrl, imageBusy, maxPendingImages, brandId, appendUploadedImage]);

  const removePendingAsset = useCallback(
    (asset: PendingAsset) => {
      void (async () => {
        if (asset.id && existing?.id) {
          const res = await softDeletePressAsset({
            brandId,
            assetId: asset.id,
          });
          if (res.error) {
            setImageErr(res.error);
            return;
          }
        }
        setPendingAssets((prev) => prev.filter((a) => a.path !== asset.path));
        setImageErr(null);
      })();
    },
    [brandId, existing?.id]
  );

  function onDeleteRelease() {
    if (!existing?.id) return;
    if (
      !confirm(
        `Remove “${title.trim() || existing.title}” from your vault? This uses soft-delete (hidden from newsroom).`
      )
    ) {
      return;
    }
    startDeleteTransition(async () => {
      const res = await softDeleteRelease(existing.id);
      if (!res.ok) {
        alert(res.message);
        return;
      }
      router.push(returnTo);
    });
  }

  return (
    <>
    <form
      ref={formRef}
      onSubmit={onFormSubmit}
      className="rounded-xl border border-brand-border bg-white p-6 shadow-sm space-y-4"
    >
      {errorMessage && (
        <div
          className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800"
          role="status"
        >
          <p>{errorMessage}</p>
          {activeErrorCode === TRIAL_RELEASE_LIMIT_ERROR_CODE ? (
            <p className="mt-2">
              <Link
                href="/pricing?reason=release-limit"
                className="font-medium text-brand-primary-700 underline-offset-2 hover:underline"
              >
                View pricing and upgrade
              </Link>
            </p>
          ) : null}
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
        <Input
          id="title"
          name="title"
          required
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="e.g. Acme Hotel opens in Singapore"
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
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={onGenerateSummary}
            loading={summaryBusy}
            className="shrink-0"
          >
            {summaryBusy ? 'Generating…' : 'Summarize with AI'}
          </Button>
        </div>
        <Textarea
          id="summary"
          name="summary"
          rows={3}
          value={summary}
          onChange={(e) => setSummary(e.target.value)}
          maxLength={280}
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
          htmlFor="image_link"
        >
          Image link (optional)
        </label>
        <Input
          id="image_link"
          name="image_link"
          type="url"
          value={imageLink}
          onChange={(e) => setImageLink(e.target.value)}
          placeholder="https://example.com/photo.jpg"
        />
        <p className="text-xs text-brand-muted">
          Optional external image URL for this release.
        </p>
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
        </div>
        <div className="mt-3">
          <p className="mb-2 text-xs text-brand-muted">Or add an image from a URL</p>
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
            <input
              type="url"
              value={imageUrl}
              onChange={(e) => setImageUrl(e.target.value)}
              disabled={imageBusy}
              placeholder="https://example.com/photo.jpg"
              className={
                'min-w-0 flex-1 rounded-xl bg-white px-4 py-2.5 text-sm text-brand-ink ' +
                'ring-1 ring-inset ring-brand-border shadow-sm placeholder:text-brand-muted/80 ' +
                'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-ring ' +
                'disabled:cursor-not-allowed disabled:opacity-60'
              }
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  void onUploadImageFromUrl();
                }
              }}
            />
            <Button
              type="button"
              size="sm"
              loading={imageBusy}
              disabled={!imageUrl.trim()}
              onClick={() => void onUploadImageFromUrl()}
              className="whitespace-nowrap"
            >
              {imageBusy ? 'Uploading…' : 'Add from URL'}
            </Button>
          </div>
        </div>
        {imageErr ? <p className="mt-2 text-xs text-red-600">{imageErr}</p> : null}
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
                  alt={a.fileName}
                  className="h-14 w-14 shrink-0 rounded-md object-cover ring-1 ring-inset ring-brand-border"
                />
                <div className="min-w-0 flex-1">
                  <div className="truncate text-xs font-medium text-brand-ink">{a.fileName}</div>
                  <div className="text-[11px] text-brand-muted">{formatBytes(a.fileSizeBytes)}</div>
                </div>
                <button
                  type="button"
                  className="shrink-0 rounded-md px-2 py-1 text-xs text-brand-muted ring-1 ring-inset ring-brand-border hover:bg-white"
                  onClick={() => removePendingAsset(a)}
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
          <Input
            id="tags"
            name="tags"
            value={tags}
            onChange={(e) => setTags(e.target.value)}
            placeholder="comma,separated,tags"
          />
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-3 pt-2">
        <Button
          type="submit"
          size="sm"
          loading={submitPending}
          disabled={deletePending}
        >
          {submitPending
            ? 'Saving…'
            : existing?.id
              ? 'Save changes'
              : 'Create draft'}
        </Button>
        {savedNotice ? (
          <span
            className="text-sm font-medium text-emerald-700"
            role="status"
          >
            Draft saved.
          </span>
        ) : null}
        {existing?.id ? (
          <button
            type="button"
            className="bb-dash-delete ml-auto"
            disabled={deletePending}
            onClick={onDeleteRelease}
          >
            {deletePending ? 'Deleting…' : 'Delete'}
          </button>
        ) : null}
      </div>
    </form>

    {existing?.id && publishConfig ? (
      <ReleasePublishPanel
        releaseId={existing.id}
        status="draft"
        plan={publishConfig.plan}
        embargoUntil={publishConfig.embargoUntil}
        beforePublish={saveCurrentDraft}
        returnTo={returnTo}
      />
    ) : null}
    </>
  );
}

