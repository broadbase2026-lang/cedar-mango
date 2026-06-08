import Link from 'next/link';
import type { FolderDetailRow } from '@/lib/journalist/folders-data';
import { removeFromFolder } from '@/app/(journalist)/journalist/folders/actions';
import { formatMonthDayShort } from '@/lib/utils/dates';

type Props = {
  folder: FolderDetailRow;
};

function formatDateShort(iso: string | null): string {
  return formatMonthDayShort(iso);
}

export function JournalistFolderDetailView({ folder }: Props) {
  return (
    <main className="bb-dash-main">
      <div className="bb-dash-inner">
        <div className="bb-dash-eyebrow">
          <div>
            <h2 className="bb-dash-section-title">{folder.name}</h2>
            <p className="bb-dash-section-desc">
              {folder.items.length} saved · Updated {formatDateShort(folder.updated_at)}
            </p>
          </div>
          <div>
            <Link href="/journalist/folders" prefetch={false} className="bb-dash-link-sm">
              ← Back to folders
            </Link>
          </div>
        </div>

        <section className="mt-6 rounded-xl border border-brand-border bg-white p-5 shadow-sm">
          {folder.items.length === 0 ? (
            <p className="text-sm text-brand-muted">Nothing saved in this folder yet.</p>
          ) : (
            <div className="space-y-3">
              {folder.items.map((it) => (
                <div key={it.press_release_id} className="flex items-start justify-between gap-4 rounded-lg border border-brand-border/70 p-4">
                  <div className="min-w-0">
                    <Link
                      href={`/journalist/release/${it.slug}`}
                      prefetch={false}
                      className="bb-dash-link"
                    >
                      {it.title}
                    </Link>
                    <div className="mt-1 text-xs text-brand-muted">
                      {it.brand_slug ? (
                        <>
                          <Link href={`/newsroom/${it.brand_slug}`} prefetch={false} className="hover:underline">
                            {it.brand_name ?? 'Brand'}
                          </Link>
                          <span className="mx-1">·</span>
                        </>
                      ) : null}
                      Published {formatDateShort(it.published_at)}
                      <span className="mx-1">·</span>
                      Saved {formatDateShort(it.saved_at)}
                    </div>
                  </div>
                  <form action={removeFromFolder}>
                    <input type="hidden" name="folderId" value={folder.id} />
                    <input type="hidden" name="pressReleaseId" value={it.press_release_id} />
                    <button type="submit" className="bb-dash-delete">
                      Remove
                    </button>
                  </form>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>
    </main>
  );
}

