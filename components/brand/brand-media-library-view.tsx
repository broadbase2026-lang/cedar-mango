'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useCallback, useEffect, useState, useTransition } from 'react';
import { sanitizeFilename } from '@/lib/utils/sanitizeFilename';
import {
  MAX_IMAGES_PER_PRESS_RELEASE,
  MAX_IMAGE_UPLOAD_BYTES,
  MAX_TRIAL_IMAGES_PER_PRESS_RELEASE,
} from '@/lib/constants/uploads';
import {
  clearHeroForRelease,
  registerPressAsset,
  setPressAssetHero,
  softDeletePressAsset,
} from '@/app/(brand)/brand/upload/actions';
import type {
  MediaAssetRow,
  MediaLibraryPayload,
  MediaReleaseOption,
} from '@/lib/brand/media-library-data';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

const BUCKET = 'press-assets-public';

function fileTypeFromFile(file: File): 'image' | 'pdf' | 'video' | 'document' {
  const t = file.type;
  if (t.startsWith('image/')) return 'image';
  if (t === 'application/pdf') return 'pdf';
  if (t.startsWith('video/')) return 'video';
  return 'document';
}

function formatBytes(n: number | null): string {
  if (n == null) return '—';
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`;
  return `${(n / (1024 * 1024)).toFixed(1)} MB`;
}

function statusBadge(status: string | null) {
  if (status === 'published') return 'bb-badge-published';
  if (status === 'draft') return 'bb-badge-draft';
  return 'bb-badge-archived';
}

const card =
  'rounded-xl border border-brand-border bg-white p-6 shadow-sm space-y-4';
const fieldLabel =
  'mb-1.5 block text-xs font-medium uppercase tracking-wide text-brand-muted';
const help = 'text-xs text-brand-muted';

type Props = {
  brandId: string;
  initial: MediaLibraryPayload;
  /** When true, cap images per release for the free trial. */
  isTrial?: boolean;
};

export function BrandMediaLibraryView({
  brandId,
  initial,
  isTrial = false,
}: Props) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [uploadBusy, setUploadBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [hydrated, setHydrated] = useState(false);

  const [releaseId, setReleaseId] = useState(
    initial.releases[0]?.id ?? ''
  );
  const [caption, setCaption] = useState('');
  const [isHero, setIsHero] = useState(false);
  const [file, setFile] = useState<File | null>(null);

  useEffect(() => {
    setHydrated(true);
  }, []);

  const onUpload = useCallback(async () => {
    setMessage(null);
    setError(null);
    if (!releaseId) {
      setError('Select a press release to attach this file to.');
      return;
    }
    if (!file) {
      setError('Choose a file to upload.');
      return;
    }

    const ft = fileTypeFromFile(file);
    if (isHero && ft !== 'image') {
      setError('Hero assets must be images.');
      return;
    }

    const maxImages = isTrial
      ? MAX_TRIAL_IMAGES_PER_PRESS_RELEASE
      : MAX_IMAGES_PER_PRESS_RELEASE;

    if (ft === 'image') {
      if (file.size > MAX_IMAGE_UPLOAD_BYTES) {
        setError(
          `Images must be ${MAX_IMAGE_UPLOAD_BYTES / (1024 * 1024)}MB or smaller.`
        );
        return;
      }
      const imageCount = initial.assets.filter(
        (a) => a.press_release_id === releaseId && a.file_type === 'image'
      ).length;
      if (imageCount >= maxImages) {
        setError(
          isTrial
            ? `Free trial allows up to ${maxImages} images per press release. Upgrade to attach more.`
            : `Maximum ${maxImages} images per press release.`
        );
        return;
      }
    }

    // Synchronous feedback so the click is always visible.
    setMessage('Uploading…');
    setUploadBusy(true);
    try {
      // Upload via server route (service-role) to avoid Storage RLS edge cases in dev.
      // Still uses brandId + ownership checks server-side.
      const safeName = sanitizeFilename(file.name);
      void safeName; // keep lint happy (filename used server-side too)
      const fd = new FormData();
      fd.set('brandId', brandId);
      fd.set('file', file);

      const uploadRes = await fetch(
        '/api/storage/press-assets-public/upload',
        {
          method: 'POST',
          body: fd,
        }
      );
      const uploadJson = (await uploadRes.json()) as
        | { ok: true; publicUrl: string }
        | { error: string };

      if (!uploadRes.ok || 'error' in uploadJson) {
        setError('error' in uploadJson ? uploadJson.error : 'Upload failed.');
        setMessage(null);
        return;
      }

      const fileUrl = uploadJson.publicUrl;

      const res = await registerPressAsset({
        brandId,
        pressReleaseId: releaseId,
        fileName: file.name,
        fileUrl,
        fileType: ft,
        fileSizeBytes: file.size,
        caption: caption.trim() || null,
        isPublic: true,
        isHero,
      });

      if (res.error) {
        setError(res.error);
        setMessage(null);
        return;
      }

      setMessage('File uploaded and linked to your release.');
      setCaption('');
      setIsHero(false);
      setFile(null);
      router.refresh();
    } catch (e) {
      const msg =
        e instanceof Error
          ? e.message
          : typeof e === 'string'
            ? e
            : 'Upload failed unexpectedly.';
      setError(msg);
      setMessage(null);
    } finally {
      setUploadBusy(false);
    }
  }, [brandId, caption, file, isHero, isTrial, initial.assets, releaseId, router]);

  function onDelete(asset: MediaAssetRow) {
    if (
      !confirm(
        `Remove “${asset.file_name}” from the library? The storage object stays in the bucket (run cleanup separately).`
      )
    ) {
      return;
    }
    startTransition(async () => {
      setError(null);
      const res = await softDeletePressAsset({
        brandId,
        assetId: asset.id,
      });
      if (res.error) {
        setError(res.error);
        return;
      }
      router.refresh();
    });
  }

  function onSetHero(asset: MediaAssetRow) {
    startTransition(async () => {
      setError(null);
      const res = await setPressAssetHero({ brandId, assetId: asset.id });
      if (res.error) {
        setError(res.error);
        return;
      }
      router.refresh();
    });
  }

  function onClearHero(releaseIdInner: string) {
    startTransition(async () => {
      setError(null);
      const res = await clearHeroForRelease({
        brandId,
        pressReleaseId: releaseIdInner,
      });
      if (res.error) {
        setError(res.error);
        return;
      }
      router.refresh();
    });
  }

  const { assets, releases } = initial;

  return (
    <main className="bb-dash-main">
      <div className="bb-dash-inner max-w-[1400px]">
        <div className="mb-8 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h1 className="text-xl font-semibold text-brand-ink">
              Media library
            </h1>
            <p className="mt-1 text-sm text-brand-muted">
              Upload files to the public press bucket and attach them to a
              release. Journalists see assets only for published releases.
            </p>
          </div>
          <Link
            href="/dashboard/brand"
            className="text-sm font-medium text-brand-primary-700 hover:underline"
          >
            ← Back to overview
          </Link>
        </div>

        {releases.length === 0 ? (
          <section className={card}>
            <h2 className="text-base font-semibold text-brand-ink">
              Create a release first
            </h2>
            <p className={help}>
              Assets must be linked to a press release. Add a draft or published
              release from the dashboard, then return here to upload files.
            </p>
            <Link href="/brand/releases/new">
              <Button type="button" size="sm" variant="ghost">
                Create a press release
              </Button>
            </Link>
          </section>
        ) : (
          <section className={card}>
            <h2 className="text-base font-semibold text-brand-ink">
              Upload file
            </h2>
            {!hydrated && (
              <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-800 ring-1 ring-inset ring-red-200">
                Client JS not hydrated — buttons won&apos;t work. Check for console errors.
              </p>
            )}
            <p className={help}>
              Files are stored under{' '}
              <span className="font-mono text-[11px]">press-assets-public</span>{' '}
              (world-readable URL). For embargoed private delivery, use a
              future private-bucket + signed-URL flow — not wired in this UI
              yet.
            </p>

            <div className="grid gap-4 pt-2 sm:grid-cols-2">
              <div className="space-y-1">
                <label htmlFor="release" className={fieldLabel}>
                  Press release
                </label>
                <select
                  id="release"
                  value={releaseId}
                  onChange={(e) => setReleaseId(e.target.value)}
                  className={
                    'flex h-11 w-full rounded-xl bg-white px-4 text-sm text-brand-ink ' +
                    'ring-1 ring-inset ring-brand-border shadow-sm ' +
                    'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-ring'
                  }
                >
                  {releases.map((r: MediaReleaseOption) => (
                    <option key={r.id} value={r.id}>
                      {r.title} ({r.status})
                    </option>
                  ))}
                </select>
              </div>
              <div className="space-y-1">
                <label htmlFor="file" className={fieldLabel}>
                  File
                </label>
                <Input
                  id="file"
                  type="file"
                  accept="image/*,application/pdf,video/*,.doc,.docx"
                  onChange={(e) => setFile(e.target.files?.[0] ?? null)}
                />
              </div>
              <div className="space-y-1 sm:col-span-2">
                <label htmlFor="caption" className={fieldLabel}>
                  Caption (optional)
                </label>
                <textarea
                  id="caption"
                  value={caption}
                  onChange={(e) => setCaption(e.target.value)}
                  rows={2}
                  className={
                    'flex w-full rounded-xl bg-white px-4 py-3 text-sm text-brand-ink ' +
                    'ring-1 ring-inset ring-brand-border shadow-sm ' +
                    'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-ring'
                  }
                  placeholder="Credit line or alt text"
                />
              </div>
              <label className="flex items-center gap-2 text-sm text-brand-ink sm:col-span-2">
                <input
                  type="checkbox"
                  checked={isHero}
                  onChange={(e) => setIsHero(e.target.checked)}
                  className="rounded border-brand-border"
                />
                Set as hero image for this release (one per release; images
                only)
              </label>
            </div>

            {error && <p className="text-sm text-red-600">{error}</p>}
            {message && <p className="text-sm text-emerald-700">{message}</p>}

            <button
              type="button"
              disabled={uploadBusy || pending}
              onClick={() => void onUpload()}
              aria-busy={uploadBusy}
              className={
                'bb-btn-primary-sm no-underline ' +
                (uploadBusy || pending ? 'opacity-60 cursor-not-allowed' : '')
              }
            >
              {uploadBusy ? 'Uploading…' : 'Upload to library'}
            </button>
          </section>
        )}

        <section className={`${card} mt-8`}>
          <h2 className="text-base font-semibold text-brand-ink">
            Your assets ({assets.length})
          </h2>
          <p className={help}>
            Soft-deleting removes the row from your vault UI; the object may
            still exist in storage.
          </p>

          {assets.length === 0 ? (
            <p className="py-8 text-center text-sm text-brand-muted">
              No files yet. Upload above once you have a release.
            </p>
          ) : (
            <div className="bb-dash-table-scroll mt-4">
              <table className="bb-dash-table min-w-[900px]">
                <thead className="bb-dash-thead">
                  <tr>
                    <th className="bb-dash-th w-14" />
                    <th className="bb-dash-th">File</th>
                    <th className="bb-dash-th">Type</th>
                    <th className="bb-dash-th">Size</th>
                    <th className="bb-dash-th">Release</th>
                    <th className="bb-dash-th">Flags</th>
                    <th className="bb-dash-th-actions">Actions</th>
                  </tr>
                </thead>
                <tbody className="bb-dash-tbody">
                  {assets.map((row) => (
                    <tr key={row.id} className="bb-dash-tr">
                      <td className="bb-dash-td-muted px-2">
                        {row.file_type === 'image' ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            src={row.file_url}
                            alt=""
                            className="h-10 w-10 rounded-md object-cover ring-1 ring-brand-border"
                          />
                        ) : (
                          <div className="flex h-10 w-10 items-center justify-center rounded-md bg-brand-surface-2 text-xs font-medium text-brand-muted">
                            {row.file_type.slice(0, 1).toUpperCase()}
                          </div>
                        )}
                      </td>
                      <td className="bb-dash-td-title max-w-[200px]">
                        <div className="bb-dash-title-clamp font-medium">
                          {row.file_name}
                        </div>
                        {row.caption && (
                          <div className="mt-0.5 text-xs text-brand-muted line-clamp-1">
                            {row.caption}
                          </div>
                        )}
                      </td>
                      <td className="bb-dash-td-muted">{row.file_type}</td>
                      <td className="bb-dash-td-muted">
                        {formatBytes(row.file_size_bytes)}
                      </td>
                      <td className="bb-dash-td-muted">
                        {row.release_title ? (
                          <>
                            <div className="font-medium text-brand-ink">
                              {row.release_title}
                            </div>
                            {row.release_status && (
                              <span
                                className={`mt-1 inline-flex ${statusBadge(row.release_status)}`}
                              >
                                {row.release_status}
                              </span>
                            )}
                          </>
                        ) : (
                          '—'
                        )}
                      </td>
                      <td className="bb-dash-td-muted text-xs">
                        {row.is_hero && <div>Hero</div>}
                        {row.is_public && <div>Public</div>}
                      </td>
                      <td className="bb-dash-td-actions">
                        <div className="bb-dash-action-row">
                          {row.file_type === 'image' &&
                            row.press_release_id &&
                            !row.is_hero && (
                              <button
                                type="button"
                                disabled={pending}
                                className="bb-dash-link-sm border-0 bg-transparent cursor-pointer p-0"
                                onClick={() => onSetHero(row)}
                              >
                                Set hero
                              </button>
                            )}
                          {row.is_hero && row.press_release_id && (
                            <button
                              type="button"
                              disabled={pending}
                              className="bb-dash-link-sm border-0 bg-transparent cursor-pointer p-0"
                              onClick={() =>
                                onClearHero(row.press_release_id!)
                              }
                            >
                              Clear hero
                            </button>
                          )}
                          <button
                            type="button"
                            className="bb-dash-link-sm border-0 bg-transparent cursor-pointer p-0 font-mono text-[11px]"
                            onClick={() =>
                              void navigator.clipboard.writeText(row.file_url)
                            }
                          >
                            Copy URL
                          </button>
                          <button
                            type="button"
                            disabled={pending}
                            className="bb-dash-delete border-0 bg-transparent cursor-pointer"
                            onClick={() => onDelete(row)}
                          >
                            Remove
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>

        <section className="mt-8 rounded-xl border border-amber-200 bg-amber-50/80 p-4 text-sm text-amber-950">
          <p className="font-medium">Known limitations</p>
          <ul className="mt-2 list-disc space-y-1 pl-5 text-amber-900/90">
            <li>
              Uploads use the <strong>public</strong> press bucket only; URLs
              are readable by anyone with the link.
            </li>
            <li>
              Removing a row does <strong>not</strong> delete the object from
              Supabase Storage (orphan cleanup is manual or a future job).
            </li>
            <li>
              Images are limited to {MAX_IMAGE_UPLOAD_BYTES / (1024 * 1024)}MB each; up to{' '}
              {isTrial ? MAX_TRIAL_IMAGES_PER_PRESS_RELEASE : MAX_IMAGES_PER_PRESS_RELEASE} images
              per press release
              {isTrial ? ' on the free trial' : ''}. Larger PDFs or videos may be up to 25MB.
            </li>
          </ul>
        </section>
      </div>
    </main>
  );
}
