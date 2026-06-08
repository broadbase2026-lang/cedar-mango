import Link from 'next/link';
import type { FolderListRow } from '@/lib/journalist/folders-data';
import { createFolder, deleteFolder, renameFolder } from '@/app/(journalist)/journalist/folders/actions';
import { formatMonthDayShort } from '@/lib/utils/dates';

type JournalistFoldersViewProps = {
  folders: FolderListRow[];
};

function formatDateShort(iso: string): string {
  return formatMonthDayShort(iso);
}

export function JournalistFoldersView({ folders }: JournalistFoldersViewProps) {
  return (
    <main className="bb-dash-main">
      <div className="bb-dash-inner">
        <div className="bb-dash-eyebrow">
          <div>
            <h2 className="bb-dash-section-title">Folders</h2>
            <p className="bb-dash-section-desc">Save releases into folders for later.</p>
          </div>
        </div>

        <section className="mt-6 rounded-xl border border-brand-border bg-white p-5 shadow-sm">
          <h3 className="text-sm font-semibold text-brand-ink">Create folder</h3>
          <form action={createFolder} className="mt-3 flex flex-col gap-3 sm:flex-row sm:items-end">
            <div className="flex-1">
              <label className="text-xs font-medium text-brand-muted">Name</label>
              <input
                name="name"
                placeholder="e.g. Hotel openings"
                className="mt-1.5 w-full rounded-lg border border-brand-border bg-white px-3 py-2 text-sm"
              />
            </div>
            <button type="submit" className="bb-btn-primary-md sm:w-auto">
              Create
            </button>
          </form>
        </section>

        <section className="mt-8 rounded-xl border border-brand-border bg-white p-5 shadow-sm">
          <h3 className="text-base font-semibold text-brand-ink">Your folders</h3>
          <div className="mt-4 space-y-4">
            {folders.length === 0 ? (
              <p className="text-sm text-brand-muted">No folders yet.</p>
            ) : (
              folders.map((f) => (
                <div key={f.id} className="rounded-lg border border-brand-border/70 p-4">
                  <div className="flex flex-wrap items-start justify-between gap-4">
                    <div className="min-w-0">
                      <Link href={`/journalist/folders/${f.id}`} prefetch={false} className="bb-dash-link">
                        {f.name}
                      </Link>
                      <div className="mt-1 text-xs text-brand-muted">
                        {f.saved_count} saved · Updated {formatDateShort(f.updated_at)}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <form action={deleteFolder}>
                        <input type="hidden" name="folderId" value={f.id} />
                        <button type="submit" className="bb-dash-delete">
                          Delete
                        </button>
                      </form>
                    </div>
                  </div>

                  <details className="mt-3">
                    <summary className="cursor-pointer text-xs font-medium text-brand-primary-700 hover:underline">
                      Rename
                    </summary>
                    <form action={renameFolder} className="mt-3 flex gap-2">
                      <input type="hidden" name="folderId" value={f.id} />
                      <input
                        name="name"
                        defaultValue={f.name}
                        className="w-full rounded-lg border border-brand-border bg-white px-3 py-2 text-sm"
                      />
                      <button type="submit" className="bb-btn-primary-sm">
                        Save
                      </button>
                    </form>
                  </details>
                </div>
              ))
            )}
          </div>
        </section>
      </div>
    </main>
  );
}

