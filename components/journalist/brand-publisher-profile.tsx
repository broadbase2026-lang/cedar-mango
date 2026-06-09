import Image from 'next/image';
import Link from 'next/link';
import type { BrandRecentRelease } from '@/lib/journalist/release-data';
import { formatMonthDayShort } from '@/lib/utils/dates';

type BrandPublisherProfileProps = {
  name: string;
  slug: string;
  logoUrl: string | null;
  website: string | null;
  recentReleases: BrandRecentRelease[];
};

export function BrandPublisherProfile({
  name,
  slug,
  logoUrl,
  website,
  recentReleases,
}: BrandPublisherProfileProps) {
  const initial = name.trim().slice(0, 1).toUpperCase() || 'B';

  return (
    <div className="rounded-xl border border-brand-border bg-white p-5 shadow-sm">
      <div className="text-xs font-semibold uppercase tracking-wide text-brand-muted">Publisher</div>

      <div className="mt-4 flex items-center gap-3">
        {logoUrl ? (
          <Image
            src={logoUrl}
            alt=""
            width={48}
            height={48}
            sizes="48px"
            className="h-12 w-12 shrink-0 rounded-full border border-brand-border object-cover"
          />
        ) : (
          <span
            className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full border border-brand-border bg-brand-surface-2 text-sm font-semibold text-brand-primary-700"
            aria-hidden
          >
            {initial}
          </span>
        )}

        <div className="min-w-0">
          <Link
            href={`/newsroom/${slug}`}
            prefetch={false}
            className="block truncate text-sm font-semibold text-brand-ink hover:underline"
          >
            {name}
          </Link>
          {website ? (
            <a
              href={website}
              target="_blank"
              rel="noreferrer"
              className="mt-0.5 block truncate text-xs text-brand-primary-700 hover:underline"
            >
              {website.replace(/^https?:\/\//, '')}
            </a>
          ) : null}
        </div>
      </div>

      <div className="mt-4 border-t border-brand-border/70 pt-4">
        <div className="text-xs font-semibold uppercase tracking-wide text-brand-muted">
          Recent releases
        </div>
        {recentReleases.length === 0 ? (
          <p className="mt-2 text-sm text-brand-muted">No other releases from this brand yet.</p>
        ) : (
          <ul className="mt-2 space-y-2">
            {recentReleases.map((r) => (
              <li key={r.id}>
                <Link
                  href={`/journalist/release/${r.slug}`}
                  prefetch={false}
                  className="group block rounded-lg border border-brand-border/70 px-3 py-2 hover:bg-brand-surface-2"
                >
                  <div className="text-sm font-medium text-brand-ink group-hover:text-brand-primary-700">
                    {r.title}
                  </div>
                  <div className="mt-0.5 text-xs text-brand-muted">
                    {formatMonthDayShort(r.published_at)}
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
