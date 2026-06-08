'use client';

import { useEffect, useMemo, useRef, useState, useTransition } from 'react';
import NextImage from 'next/image';
import { MAX_IMAGE_UPLOAD_BYTES } from '@/lib/constants/uploads';

type Props = {
  label?: string;
  initialUrl: string | null;
  displayFallback: string;
  saveAvatarAction: (formData: FormData) => void | Promise<void>;
};

type UploadResult =
  | { ok: true; publicUrl: string }
  | { ok: false; error: string };

function clamp(n: number, min: number, max: number) {
  return Math.max(min, Math.min(max, n));
}

async function fileToImage(file: File): Promise<HTMLImageElement> {
  const url = URL.createObjectURL(file);
  try {
    const img = new Image();
    img.decoding = 'async';
    img.src = url;
    await new Promise<void>((resolve, reject) => {
      img.onload = () => resolve();
      img.onerror = () => reject(new Error('Failed to load image.'));
    });
    return img;
  } finally {
    URL.revokeObjectURL(url);
  }
}

async function renderCircleAvatarPng(input: {
  file: File;
  outSize: number;
  scale: number;
  offsetX: number;
  offsetY: number;
}): Promise<Blob> {
  const img = await fileToImage(input.file);

  const canvas = document.createElement('canvas');
  canvas.width = input.outSize;
  canvas.height = input.outSize;

  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Canvas is not supported in this browser.');

  ctx.clearRect(0, 0, input.outSize, input.outSize);

  // Circular clip
  ctx.save();
  ctx.beginPath();
  ctx.arc(input.outSize / 2, input.outSize / 2, input.outSize / 2, 0, Math.PI * 2);
  ctx.closePath();
  ctx.clip();

  // Draw the image with pan+zoom around the square crop.
  const s = input.scale;
  const drawW = img.naturalWidth * s;
  const drawH = img.naturalHeight * s;
  const dx = input.outSize / 2 - drawW / 2 + input.offsetX;
  const dy = input.outSize / 2 - drawH / 2 + input.offsetY;

  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = 'high';
  ctx.drawImage(img, dx, dy, drawW, drawH);
  ctx.restore();

  const blob: Blob | null = await new Promise((resolve) =>
    canvas.toBlob(resolve, 'image/png', 0.92)
  );
  if (!blob) throw new Error('Failed to export image.');
  return blob;
}

async function uploadAvatar(file: File): Promise<UploadResult> {
  const form = new FormData();
  form.set('file', file);

  const res = await fetch('/api/storage/avatars/upload', { method: 'POST', body: form });
  const json = (await res.json().catch(() => null)) as any;
  if (!res.ok || !json?.ok) {
    return { ok: false, error: String(json?.error || 'Upload failed.') };
  }
  return { ok: true, publicUrl: String(json.publicUrl) };
}

export function ProfilePhotoUploader({
  label = 'Profile photo',
  initialUrl,
  displayFallback,
  saveAvatarAction,
}: Props) {
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [isPending, startTransition] = useTransition();
  const [currentUrl, setCurrentUrl] = useState<string | null>(initialUrl);

  // Crop UI state
  const [file, setFile] = useState<File | null>(null);
  const [objectUrl, setObjectUrl] = useState<string | null>(null);
  const [scale, setScale] = useState(1);
  const [offsetX, setOffsetX] = useState(0);
  const [offsetY, setOffsetY] = useState(0);
  const [dragging, setDragging] = useState(false);
  const [dragStart, setDragStart] = useState<{ x: number; y: number; ox: number; oy: number } | null>(
    null
  );

  const [error, setError] = useState<string | null>(null);
  const [savedFlash, setSavedFlash] = useState<string | null>(null);

  const showModal = Boolean(file && objectUrl);

  useEffect(() => {
    setCurrentUrl(initialUrl);
  }, [initialUrl]);

  useEffect(() => {
    if (!objectUrl) return;
    return () => URL.revokeObjectURL(objectUrl);
  }, [objectUrl]);

  const initials = useMemo(() => {
    const x = (displayFallback || 'A').trim();
    return x.slice(0, 1).toUpperCase();
  }, [displayFallback]);

  function openPicker() {
    setError(null);
    inputRef.current?.click();
  }

  function closeModal() {
    setFile(null);
    setObjectUrl(null);
    setScale(1);
    setOffsetX(0);
    setOffsetY(0);
    setDragging(false);
    setDragStart(null);
    setError(null);
  }

  async function onSelectFile(f: File | null) {
    if (!f) return;
    setError(null);

    if (!/^image\//.test(f.type)) {
      setError('Please choose an image file.');
      return;
    }
    if (f.size > MAX_IMAGE_UPLOAD_BYTES) {
      setError(
        `Please choose an image smaller than ${MAX_IMAGE_UPLOAD_BYTES / (1024 * 1024)}MB.`
      );
      return;
    }

    setFile(f);
    setObjectUrl(URL.createObjectURL(f));
    setScale(1);
    setOffsetX(0);
    setOffsetY(0);
  }

  async function onSave() {
    if (!file) return;
    setError(null);
    setSavedFlash(null);

    startTransition(async () => {
      try {
        const blob = await renderCircleAvatarPng({
          file,
          outSize: 350,
          scale,
          offsetX,
          offsetY,
        });

        const outFile = new File([blob], 'avatar.png', { type: 'image/png' });
        const up = await uploadAvatar(outFile);
        if (!up.ok) {
          setError(up.error);
          return;
        }

        const fd = new FormData();
        fd.set('avatar_url', up.publicUrl);
        await saveAvatarAction(fd);

        setCurrentUrl(up.publicUrl);
        setSavedFlash('Saved.');
        window.setTimeout(() => setSavedFlash(null), 2500);
        closeModal();
      } catch (e: any) {
        setError(e?.message || 'Something went wrong.');
      }
    });
  }

  return (
    <section className="space-y-3">
      <div className="flex items-center justify-between gap-4">
        <div>
          <div className="text-xs font-medium uppercase tracking-wide text-brand-muted">{label}</div>
          <p className="mt-1 text-xs text-brand-muted">Square upload with circular crop.</p>
        </div>
        <div className="flex items-center gap-3">
          {currentUrl ? (
            <NextImage
              src={currentUrl}
              alt=""
              width={44}
              height={44}
              sizes="44px"
              className="h-11 w-11 rounded-full object-cover ring-1 ring-inset ring-brand-border bg-brand-surface-2"
            />
          ) : (
            <div className="h-11 w-11 rounded-full bg-brand-surface-2 ring-1 ring-inset ring-brand-border flex items-center justify-center text-sm font-semibold text-brand-primary-700">
              {initials}
            </div>
          )}
          <button
            type="button"
            onClick={openPicker}
            className="bb-btn-primary-sm disabled:opacity-60"
            disabled={isPending}
          >
            {currentUrl ? 'Change' : 'Upload'}
          </button>
          <input
            ref={inputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(e) => onSelectFile(e.target.files?.[0] ?? null)}
          />
        </div>
      </div>

      {savedFlash ? (
        <div className="rounded-lg border border-brand-border/70 bg-brand-surface-2 px-3 py-2 text-sm text-brand-ink">
          {savedFlash}
        </div>
      ) : null}
      {error ? <div className="text-sm text-red-600">{error}</div> : null}

      {showModal ? (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
          role="dialog"
          aria-modal="true"
        >
          <div className="w-full max-w-lg rounded-2xl bg-white shadow-media-soft ring-1 ring-inset ring-brand-border">
            <div className="border-b border-brand-border px-5 py-4">
              <div className="text-sm font-semibold text-brand-ink">Crop your photo</div>
              <div className="mt-1 text-xs text-brand-muted">
                Drag to reposition. Use zoom to fit.
              </div>
            </div>

            <div className="p-5 space-y-4">
              <div className="flex items-center justify-center">
                <div
                  className="relative h-[320px] w-[320px] overflow-hidden rounded-2xl bg-brand-surface-2 ring-1 ring-inset ring-brand-border select-none touch-none"
                  onPointerDown={(e) => {
                    if (!objectUrl) return;
                    (e.currentTarget as HTMLDivElement).setPointerCapture(e.pointerId);
                    setDragging(true);
                    setDragStart({ x: e.clientX, y: e.clientY, ox: offsetX, oy: offsetY });
                  }}
                  onPointerMove={(e) => {
                    if (!dragging || !dragStart) return;
                    const dx = e.clientX - dragStart.x;
                    const dy = e.clientY - dragStart.y;
                    setOffsetX(dragStart.ox + dx);
                    setOffsetY(dragStart.oy + dy);
                  }}
                  onPointerUp={() => {
                    setDragging(false);
                    setDragStart(null);
                  }}
                >
                  {objectUrl ? (
                    // Blob URL + drag/zoom crop needs native img sizing (not next/image).
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={objectUrl}
                      alt=""
                      draggable={false}
                      className="absolute left-1/2 top-1/2 max-w-none"
                      style={{
                        transform: `translate(-50%, -50%) translate(${offsetX}px, ${offsetY}px) scale(${scale})`,
                        transformOrigin: 'center',
                      }}
                    />
                  ) : null}

                  {/* circular overlay */}
                  <div className="pointer-events-none absolute inset-0">
                    <div
                      className="absolute left-1/2 top-1/2 h-[260px] w-[260px] -translate-x-1/2 -translate-y-1/2 rounded-full ring-2 ring-white/90 shadow-[0_0_0_9999px_rgba(0,0,0,0.35)]"
                      aria-hidden
                    />
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between text-xs text-brand-muted">
                  <span>Zoom</span>
                  <span className="tabular-nums">{scale.toFixed(2)}×</span>
                </div>
                <input
                  type="range"
                  min={1}
                  max={3}
                  step={0.01}
                  value={scale}
                  onChange={(e) => setScale(clamp(Number(e.target.value), 1, 3))}
                  className="w-full"
                />
              </div>

              {error ? <div className="text-sm text-red-600">{error}</div> : null}
            </div>

            <div className="flex items-center justify-end gap-2 border-t border-brand-border px-5 py-4">
              <button
                type="button"
                onClick={closeModal}
                className="bb-btn-primary-sm bg-white text-brand-ink ring-1 ring-inset ring-brand-border hover:bg-brand-surface-2"
                disabled={isPending}
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={onSave}
                className="bb-btn-primary-sm disabled:opacity-60"
                disabled={isPending}
              >
                {isPending ? 'Saving…' : 'Save photo'}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </section>
  );
}

