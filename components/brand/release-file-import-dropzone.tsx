'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import {
  RELEASE_IMPORT_ACCEPT,
  RELEASE_IMPORT_FORMATS_LABEL,
} from '@/lib/brand/release-import-files';

function dragHasFiles(e: DragEvent | React.DragEvent): boolean {
  const dt = e.dataTransfer;
  if (!dt) return false;
  if (dt.files && dt.files.length > 0) return true;
  return Array.from(dt.items ?? []).some((it) => it.kind === 'file');
}

type Props = {
  disabled?: boolean;
  pending?: boolean;
  onFile: (file: File) => void | Promise<void>;
  /** Prevent the browser from navigating when a file is dropped outside the zone. */
  guardDocumentDrop?: boolean;
  className?: string;
};

export function ReleaseFileImportDropzone({
  disabled = false,
  pending = false,
  onFile,
  guardDocumentDrop = false,
  className = '',
}: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const dropRef = useRef<HTMLDivElement>(null);
  const [dragOver, setDragOver] = useState(false);

  const onPick = useCallback(() => {
    if (pending || disabled) return;
    inputRef.current?.click();
  }, [pending, disabled]);

  const handleFile = useCallback(
    (file: File) => {
      void onFile(file);
    },
    [onFile]
  );

  useEffect(() => {
    if (!guardDocumentDrop) return;

    function onDocDragEnter(e: DragEvent) {
      if (!e.dataTransfer) return;
      e.preventDefault();
    }

    function onDocDragOver(e: DragEvent) {
      if (!e.dataTransfer) return;
      e.preventDefault();
    }

    function onDocDrop(e: DragEvent) {
      if (!e.dataTransfer) return;
      e.preventDefault();
      setDragOver(false);
    }

    document.addEventListener('dragenter', onDocDragEnter, true);
    document.addEventListener('dragover', onDocDragOver, true);
    document.addEventListener('drop', onDocDrop, true);
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
  }, [guardDocumentDrop]);

  const busy = pending || disabled;

  return (
    <div className={className}>
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
          if (busy) return;
          if (!dragHasFiles(e)) return;
          setDragOver(true);
        }}
        onDragOver={(e) => {
          e.preventDefault();
          e.stopPropagation();
          if (busy) return;
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
          if (busy) return;
          const file = e.dataTransfer.files?.[0];
          if (!file) return;
          void handleFile(file);
        }}
        className={
          'rounded-xl border-2 border-dashed px-4 py-8 text-center text-sm transition-colors ' +
          (dragOver
            ? 'border-brand-ring bg-brand-surface-2 text-brand-ink'
            : 'border-brand-border text-brand-muted hover:border-brand-ring/60')
        }
        aria-disabled={busy}
      >
        {pending ? (
          <p className="text-brand-ink">Scanning document with Gemini…</p>
        ) : (
          <>
            <p>
              Drag &amp; drop a press release file here, or{' '}
              <span className="font-medium text-brand-primary-700 underline-offset-2 hover:underline">
                browse
              </span>
            </p>
            <p className="mt-2 text-xs">
              {RELEASE_IMPORT_FORMATS_LABEL} — title, summary, body, vertical, and tags
              are filled automatically.
            </p>
          </>
        )}
      </div>

      <input
        ref={inputRef}
        type="file"
        className="sr-only"
        accept={RELEASE_IMPORT_ACCEPT}
        disabled={busy}
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (!file) return;
          e.currentTarget.value = '';
          void handleFile(file);
        }}
      />
    </div>
  );
}
