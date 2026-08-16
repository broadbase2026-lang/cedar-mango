import Link from 'next/link';
import type { FolderRow } from '@/lib/journalist/discover-data';
import type { JournalistReleaseDetail, JournalistReleaseAsset } from '@/lib/journalist/release-data';
import { toggleSaveReleaseToFolder } from '@/lib/journalist/actions';
import { BrandPublisherProfile } from '@/components/journalist/brand-publisher-profile';
import { DownloadAssetButton } from '@/components/DownloadAssetButton';
import { pickHeroAsset } from '@/lib/press-assets/pick-hero-asset';
import { RichTextRender } from '@/components/rich-text/rich-text-render';
import { stripLeadingTitleFromHtml } from '@/lib/rich-text/strip-leading-title';
import { formatDateLong } from '@/lib/utils/dates';
import { LogPublicationButton } from '@/components/journalist/LogPublicationButton';
import { EmptyState } from '@/components/ui/empty-state';
import { ButtonLink } from '@/components/ui/button';

type Props = {
  release: JournalistReleaseDetail;
  folders: FolderRow[];
  publicationNameSuggestions: string[];
};

const fieldEyebrowClass =
  'text-xs font-semibold uppercase tracking-wide text-brand-muted';

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
  const bodyHtml = stripLeadingTitleFromHtml(release.body, release.title);

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
          <div className="flex flex-wrap items-center gap-2">
            <Link href="/journalist/discover" prefetch={false} className="bb-pill-btn no-underline">
              ← Back
            </Link>
            <LogPublicationButton
              pressReleaseId={release.id}
              pressReleaseTitle={release.title}
              publicationNameSuggestions={publicationNameSuggestions}
            />
            <details className="relative">
              <summary className="bb-pill-btn cursor-pointer list-none [&::-webkit-details-marker]:hidden">
                Save to folder
              </summary>
              <div className="absolute right-0 z-30 mt-2 w-64 rounded-lg border border-brand-border bg-white p-2 shadow-media-soft">
                {folders.length === 0 ? (
                  <EmptyState
                    compact
                    heading="Create a folder first"
                    action={
                      <ButtonLink href="/journalist/folders" size="sm">
                        Go to Folders
                      </ButtonLink>
                    }
                  />
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
                              (savedHere ? 'text-accent-hover' : 'text-brand-ink')
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

            {release.summary ? (
              <div className="rounded-xl border border-brand-border bg-white p-6 shadow-sm">
                <div className={fieldEyebrowClass}>Summary</div>
                <p className="mt-2 text-sm font-medium text-brand-ink">{release.summary}</p>
              </div>
            ) : null}

            {release.image_link ? (
              <div className="rounded-xl border border-brand-border bg-white p-6 shadow-sm">
                <div className={fieldEyebrowClass}>Image link</div>
                <div className="mt-3 overflow-hidden rounded-lg border border-brand-border/70 bg-brand-surface-2">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={release.image_link}
                    alt={release.title}
                    className="aspect-[16/9] w-full object-cover"
                  />
                </div>
                <a
                  href={release.image_link}
                  target="_blank"
                  rel="noreferrer"
                  className="mt-3 block truncate text-sm font-medium text-brand-primary-700 hover:underline"
                >
                  {release.image_link}
                </a>
              </div>
            ) : null}

            <article className="rounded-xl border border-brand-border bg-white p-6 shadow-sm">
              <div className={fieldEyebrowClass}>Body</div>
              <RichTextRender html={bodyHtml} className="mt-3 bb-richtext max-w-prose" />
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
              <div className={fieldEyebrowClass}>Assets</div>
              <div className="mt-3 space-y-2">
                {release.assets.length === 0 ? (
                  <EmptyState compact heading="No assets attached" />
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
