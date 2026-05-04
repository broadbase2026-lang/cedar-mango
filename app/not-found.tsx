import Link from 'next/link';

export default function NotFound() {
  return (
    <main className="min-h-screen bg-brand-surface px-6 py-16 text-brand-ink">
      <div className="mx-auto max-w-lg space-y-4">
        <h1 className="text-xl font-semibold">Page not found</h1>
        <p className="text-sm text-brand-muted">
          The page you requested does not exist.
        </p>
        <Link
          href="/"
          className="inline-block rounded-lg bg-brand-primary px-4 py-2 text-sm font-medium text-white"
        >
          Back to home
        </Link>
      </div>
    </main>
  );
}
