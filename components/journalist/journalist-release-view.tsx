import Link from 'next/link';
import type { FolderRow } from '@/lib/journalist/discover-data';
import type { JournalistReleaseDetail, JournalistReleaseAsset } from '@/lib/journalist/release-data';
import { toggleSaveReleaseToFolder } from '@/lib/journalist/actions';
import { BrandPublisherProfile } from '@/components/journalist/brand-publisher-profile';
import { DownloadAssetButton } from '@/components/DownloadAssetButton';
import { pickHeroAsset } from '@/lib/press-assets/pick-hero-asset';
import { RichTextRender } from '@/components/rich-text/rich-text-render';
import { formatDateLong } from '@/lib/utils/dates';
import { LogPublicationButton } from '@/components/journalist/LogPublicationButton';

type Props = {
  release: JournalistReleaseDetail;
  folders: FolderRow[];
  publicationNameSuggestions: string[];
};

function ReleaseAssetRow({ asset }: { asset: JournalistReleaseAsset }) {
  if (asset.privateDownload) {
    return (
      <div className="rounded-lg border border-brand-border/70 p-3 text-sm">
        <div className="truncate font-medium text-brand-ink">{asset.file_name}</div>
        <div className="mt-1 text-xs text-brand-muted">{asset.file_type}</div>
        {asset.caption ? (
          <div className="mt-1 text-xs text-brand-muted">{asset.caption}</div>
        ) : null}
        <div className="mt-3">
          <DownloadAssetButton
            assetId={asset.id}
            fileName={asset.file_name}
            embargoUntil={asset.privateDownload.embargoUntil}
          />
        </div>
      </div>
    );
  }

  return (
    <a
      href={`/api/analytics/asset-download?assetId=${encodeURIComponent(asset.id)}`}
      className="block rounded-lg border border-brand-border/70 p-3 text-sm hover:bg-brand-surface-2"
    >
      <div className="truncate font-medium text-brand-ink">{asset.file_name}</div>
      <div className="mt-1 text-xs text-brand-muted">{asset.file_type}</div>
      {asset.caption ? <div className="mt-1 text-xs text-brand-muted">{asset.caption}</div> : null}
    </a>
  );
}

export function JournalistReleaseView({ release, folders, publicationNameSuggestions }: Props) {
  const hero = pickHeroAsset(release.assets);

  return (
    <main className="bb-dash-main">
      <div className="bb-dash-inner">
        <div className="bb-dash-eyebrow">
          <div>
            <h2 className="font-serif text-2xl font-semibold leading-8 text-brand-ink">{release.title}</h2>
            <p className="bb-dash-section-desc">
              {release.brand ? (
                <>
                  <Link href={`/newsroom/${release.brand.slug}`} prefetch={false} className="hover:underline">
                    {release.brand.name}
                  </Link>
                  <span className="mx-1">·</span>
                </>
              ) : null}
              Published {formatDateLong(release.published_at)}
            </p>
          </div>
          <div className="flex items-center gap-3">
            <Link href="/journalist/discover" prefetch={false} className="bb-dash-link-sm">
              ← Back
            </Link>
            <LogPublicationButton
              pressReleaseId={release.id}
              pressReleaseTitle={release.title}
              publicationNameSuggestions={publicationNameSuggestions}
            />
            <details className="relative">
              <summary className="cursor-pointer text-xs font-medium text-brand-primary-700 hover:underline">
                Save to folder
              </summary>
              <div className="absolute right-0 z-30 mt-2 w-64 rounded-lg border border-brand-border bg-white p-2 shadow-media-soft">
                {folders.length === 0 ? (
                  <div className="p-2 text-xs text-brand-muted">Create a folder first (Folders →).</div>
                ) : (
                  <div className="space-y-1">
                    {folders.map((f) => {
                      const savedHere = release.saved_folder_ids.includes(f.id);
                      return (
                        <form key={f.id} action={toggleSaveReleaseToFolder}>
                          <input type="hidden" name="pressReleaseId" value={release.id} />
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
                <div className="mt-2 border-t border-brand-border/70 pt-2">
                  <Link href="/journalist/folders" prefetch={false} className="bb-dash-link-sm">
                    Manage folders →
                  </Link>
                </div>
              </div>
            </details>
          </div>
        </div>

        <div className="mt-8 grid grid-cols-1 gap-8 lg:grid-cols-[1fr_minmax(280px,360px)]">
          <div className="space-y-6">
            {hero ? (
              <div className="overflow-hidden rounded-xl border border-brand-border bg-white shadow-sm">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={hero.file_url}
                  alt={hero.caption ?? hero.file_name}
                  className="aspect-[16/9] w-full object-cover"
                />
              </div>
            ) : null}

            <article className="rounded-xl border border-brand-border bg-white p-6 shadow-sm">
              {release.summary ? (
                <p className="text-sm font-medium text-brand-ink">{release.summary}</p>
              ) : null}
              <RichTextRender html={release.body} className="mt-4 bb-richtext" />
            </article>
          </div>

          <aside className="space-y-4">
            {release.brand ? (
              <BrandPublisherProfile
                name={release.brand.name}
                slug={release.brand.slug}
                logoUrl={release.brand.logo_url}
                website={release.brand.website}
                recentReleases={release.brandRecentReleases}
              />
            ) : null}

            <div className="rounded-xl border border-brand-border bg-white p-5 shadow-sm">
              <div className="text-xs font-semibold uppercase tracking-wide text-brand-muted">
                Assets
              </div>
              <div className="mt-3 space-y-2">
                {release.assets.length === 0 ? (
                  <p className="text-sm text-brand-muted">No assets attached.</p>
                ) : (
                  release.assets.map((a) => <ReleaseAssetRow key={a.id} asset={a} />)
                )}
              </div>
            </div>
          </aside>
        </div>
      </div>
    </main>
  );
}

