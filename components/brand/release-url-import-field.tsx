'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

type Props = {
  pending: boolean;
  disabled?: boolean;
  onImport: (url: string) => Promise<void>;
};

export function ReleaseUrlImportField({ pending, disabled, onImport }: Props) {
  const [url, setUrl] = useState('');

  return (
    <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
      <Input
        type="url"
        value={url}
        onChange={(e) => setUrl(e.target.value)}
        disabled={pending || disabled}
        placeholder="https://example.com/press-release"
        className="min-w-0 flex-1"
      />
      <Button
        type="button"
        size="sm"
        loading={pending}
        disabled={disabled || !url.trim()}
        onClick={() => void onImport(url)}
        className="whitespace-nowrap"
      >
        {pending ? 'Importing…' : 'Import from URL'}
      </Button>
    </div>
  );
}
