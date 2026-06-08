import Link from 'next/link';
import { toggleSaveReleaseToFolder } from '@/lib/journalist/actions';
import type { FolderRow } from '@/lib/journalist/discover-data';
import type { SearchResultRow } from '@/lib/journalist/search-data';
import { formatMonthDayShort } from '@/lib/utils/dates';
import { LogPublicationButton } from '@/components/journalist/LogPublicationButton';

type JournalistSearchViewProps = {
  q: string;
  vertical: string;
  folders: FolderRow[];
  results: SearchResultRow[];
  publicationNameSuggestions: string[];
};

function formatDateShort(iso: string | null): string {
  return formatMonthDayShort(iso);
}

export function JournalistSearchView({ q, vertical, folders, results, publicationNameSuggestions }: JournalistSearchViewProps) {
  return (
    <main className="bb-dash-main">
      <div className="bb-dash-inner">
        <div className="bb-dash-eyebrow">
          <div>
            <h2 className="bb-dash-section-title">Search</h2>
            <p className="bb-dash-section-desc">Find press releases across all brands.</p>
          </div>
        </div>

        <form className="mt-6 rounded-xl border border-brand-border bg-white p-5 shadow-sm">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="sm:col-span-2">
              <label className="text-xs font-medium text-brand-muted">Query</label>
              <input
                name="q"
                defaultValue={q}
                placeholder="Try: “menu launch Singapore”"
                className="mt-1.5 w-full rounded-lg border border-brand-border bg-white px-3 py-2 text-sm text-brand-ink placeholder:text-brand-muted/80 focus:border-teal-700 focus:ring-1"
              />
            </div>
            <div>
              <label className="text-xs font-medium text-brand-muted">Vertical</label>
              <select
                name="vertical"
                defaultValue={vertical}
                className="bb-dash-select"
              >
                <option value="all">All</option>
                <option value="fnb">F&amp;B</option>
                <option value="travel">Travel</option>
                <option value="culture">Culture</option>
                <option value="fashion">Fashion</option>
                <option value="lifestyle">Lifestyle</option>
                <option value="other">Other</option>
              </select>
            </div>
            <div className="flex items-end">
              <button type="submit" className="bb-btn-primary-md w-full sm:w-auto">
                Search
              </button>
            </div>
          </div>
        </form>

        <section className="mt-8 rounded-xl border border-brand-border bg-white p-5 shadow-sm">
          <div className="flex items-baseline justify-between gap-3">
            <h3 className="text-base font-semibold text-brand-ink">Results</h3>
            <Link href="/journalist/folders" prefetch={false} className="bb-dash-link-sm">
              Manage folders →
            </Link>
          </div>

          <div className="mt-4 space-y-4">
            {results.length === 0 ? (
              <p className="text-sm text-brand-muted">No results.</p>
            ) : (
              results.map((r) => (
                <div key={r.id} className="rounded-lg border border-brand-border/70 p-4">
                  <div className="flex items-start justify-between gap-4">
                    <div className="min-w-0">
                      <Link
                        href={`/journalist/release/${r.slug}`}
                        prefetch={false}
                        className="bb-dash-link"
                      >
                        <span className="bb-dash-title-clamp">{r.title}</span>
                      </Link>
                      <div className="mt-1 text-xs text-brand-muted">
                        {r.brand ? (
                          <>
                            <Link
                              href={`/newsroom/${r.brand.slug}`}
                              prefetch={false}
                              className="hover:underline"
                            >
                              {r.brand.name}
                            </Link>
                            <span className="mx-1">·</span>
                          </>
                        ) : null}
                        {formatDateShort(r.published_at)}
                      </div>
                      {r.summary ? (
                        <p className="mt-2 line-clamp-2 text-sm text-brand-muted">{r.summary}</p>
                      ) : null}
                    </div>

                    <div className="flex shrink-0 items-center gap-3">
                    <LogPublicationButton
                      pressReleaseId={r.id}
                      pressReleaseTitle={r.title}
                      publicationNameSuggestions={publicationNameSuggestions}
                    />
                    <details className="relative">
                      <summary className="cursor-pointer text-xs font-medium text-brand-primary-700 hover:underline">
                        Save
                      </summary>
                      <div className="absolute right-0 z-30 mt-2 w-64 rounded-lg border border-brand-border bg-white p-2 shadow-media-soft">
                        {folders.length === 0 ? (
                          <div className="p-2 text-xs text-brand-muted">
                            Create a folder first (Folders →).
                          </div>
                        ) : (
                          <div className="space-y-1">
                            {folders.map((f) => {
                              const savedHere = r.saved_folder_ids.includes(f.id);
                              return (
                                <form key={f.id} action={toggleSaveReleaseToFolder}>
                                  <input type="hidden" name="pressReleaseId" value={r.id} />
                                  <input type="hidden" name="folderId" value={f.id} />
                                  <button
                                    type="submit"
                                    className={
                                      'w-full rounded-md px-2 py-2 text-left text-xs hover:bg-brand-surface-2 ' +
                                      (savedHere ? 'text-teal-900' : 'text-brand-ink')
                                    }
                                  >
                                    {savedHere ? '✓ ' : ''}
                                    {f.name}
                                  </button>
                                </form>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    </details>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </section>
      </div>
    </main>
  );
}

