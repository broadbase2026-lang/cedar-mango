import Link from 'next/link';
import type { ArchiveReleaseRow } from '@/lib/public/load-archive-releases';
import { labelVertical } from '@/lib/seo/verticals';
import { EmptyState } from '@/components/ui/empty-state';

type Props = {
  releases: ArchiveReleaseRow[];
  emptyMessage?: string;
};

export function PublicReleaseList({
  releases,
  emptyMessage = 'No published releases found.',
}: Props) {
  if (releases.length === 0) {
    return <EmptyState compact heading={emptyMessage} />;
  }

  return (
    <section className="space-y-4">
      {releases.map((r) => {
        const vertical = labelVertical(r.industry_vertical);
        return (
          <article
            key={r.id}
            className="rounded-2xl border border-border-default bg-white p-5 shadow-sm"
          >
            <h2 className="font-heading text-xl text-text-primary">
              <Link href={`/release/${r.slug}`} className="hover:underline">
                {r.title}
              </Link>
            </h2>
            {r.brand_name ? (
              <p className="mt-1 text-sm text-text-secondary">
                {r.brand_slug ? (
                  <Link
                    href={`/newsroom/${r.brand_slug}`}
                    className="hover:underline"
                  >
                    {r.brand_name}
                  </Link>
                ) : (
                  r.brand_name
                )}
                {vertical ? ` · ${vertical}` : null}
              </p>
            ) : null}
            {r.summary ? (
              <p className="mt-2 text-sm text-text-secondary">{r.summary}</p>
            ) : null}
            <p className="mt-3 text-xs text-text-disabled">
              {r.published_at
                ? new Date(r.published_at).toLocaleDateString('en-GB', {
                    day: '2-digit',
                    month: 'short',
                    year: 'numeric',
                  })
                : '—'}
            </p>
          </article>
        );
      })}
    </section>
  );
}

type PaginationProps = {
  page: number;
  totalPages: number;
  hrefForPage: (page: number) => string;
};

export function ArchivePagination({
  page,
  totalPages,
  hrefForPage,
}: PaginationProps) {
  if (totalPages <= 1) return null;

  return (
    <nav
      aria-label="Pagination"
      className="mt-8 flex items-center justify-between gap-4 text-sm"
    >
      {page > 1 ? (
        <Link
          href={hrefForPage(page - 1)}
          className="font-medium text-brand-primary-700 hover:underline"
        >
          Previous
        </Link>
      ) : (
        <span className="text-text-disabled">Previous</span>
      )}
      <span className="text-text-secondary">
        Page {page} of {totalPages}
      </span>
      {page < totalPages ? (
        <Link
          href={hrefForPage(page + 1)}
          className="font-medium text-brand-primary-700 hover:underline"
        >
          Next
        </Link>
      ) : (
        <span className="text-text-disabled">Next</span>
      )}
    </nav>
  );
}
