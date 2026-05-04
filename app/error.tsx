'use client';

import { useEffect } from 'react';

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <main className="min-h-screen bg-brand-surface px-6 py-16 text-brand-ink">
      <div className="mx-auto max-w-lg space-y-4">
        <h1 className="text-xl font-semibold">Something went wrong</h1>
        <p className="text-sm text-brand-muted">
          Please try again. If the problem continues, refresh the page or come
          back in a few minutes.
        </p>
        <button
          type="button"
          onClick={() => reset()}
          className="rounded-lg bg-brand-primary px-4 py-2 text-sm font-medium text-white"
        >
          Try again
        </button>
      </div>
    </main>
  );
}
