'use client';

import { useState } from 'react';

type Props = {
  pending: boolean;
  disabled?: boolean;
  onImport: (url: string) => Promise<void>;
};

export function ReleaseUrlImportField({ pending, disabled, onImport }: Props) {
  const [url, setUrl] = useState('');

  return (
    <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
      <input
        type="url"
        value={url}
        onChange={(e) => setUrl(e.target.value)}
        disabled={pending || disabled}
        placeholder="https://example.com/press-release"
        className={
          'min-w-0 flex-1 rounded-xl bg-white px-4 py-2.5 text-sm text-brand-ink ' +
          'ring-1 ring-inset ring-brand-border shadow-sm placeholder:text-brand-muted/80 ' +
          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-ring ' +
          'disabled:cursor-not-allowed disabled:opacity-60'
        }
      />
      <button
        type="button"
        disabled={pending || disabled || !url.trim()}
        onClick={() => void onImport(url)}
        className="bb-btn-primary-sm whitespace-nowrap disabled:opacity-60"
      >
        {pending ? 'Importing…' : 'Import from URL'}
      </button>
    </div>
  );
}
