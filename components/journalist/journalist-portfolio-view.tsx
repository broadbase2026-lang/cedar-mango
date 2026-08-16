'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { EmptyState } from '@/components/ui/empty-state';
import { Modal } from '@/components/ui/modal';
import { LogPublicationModal } from '@/components/journalist/LogPublicationModal';
import { PortfolioSettingsForm } from '@/components/journalist/portfolio-settings-form';
import type {
  JournalistPortfolioSettings,
  JournalistPublication,
} from '@/types';

type PortfolioPublication = JournalistPublication & {
  press_release_slug: string | null;
};

type Props = {
  settings: JournalistPortfolioSettings | null;
  publications: PortfolioPublication[];
  appBaseUrl: string;
  hasEmail: boolean;
};

type ModalState =
  | { mode: 'create' }
  | { mode: 'edit'; publication: PortfolioPublication }
  | null;

function formatPublishedAt(value: string): string {
  return new Date(value).toLocaleDateString('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
}

export function JournalistPortfolioView({
  settings,
  publications,
  appBaseUrl,
  hasEmail,
}: Props) {
  const router = useRouter();
  const [modalState, setModalState] = useState<ModalState>(null);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [pendingRemoveId, setPendingRemoveId] = useState<string | null>(null);
  const [togglingPublic, setTogglingPublic] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);

  const live = publications.filter((p) => !p.deleted_at);
  const totalArticles = live.length;
  const distinctPublications = new Set(
    live.map((p) => p.publication_name)
  ).size;
  const startOfMonth = new Date();
  startOfMonth.setDate(1);
  startOfMonth.setHours(0, 0, 0, 0);
  const thisMonth = live.filter(
    (p) => new Date(p.published_at) >= startOfMonth
  ).length;

  const suggestions = Array.from(
    new Set(live.map((p) => p.publication_name))
  );

  async function confirmRemove() {
    if (!pendingRemoveId) return;
    const id = pendingRemoveId;
    setBusyId(id);
    setActionError(null);
    try {
      const res = await fetch(`/api/journalist/portfolio/publications/${id}`, {
        method: 'DELETE',
      });
      if (!res.ok) {
        const data = (await res.json().catch(() => null)) as
          | { error?: string }
          | null;
        setActionError(data?.error ?? 'Something went wrong. Please try again.');
        return;
      }
      setPendingRemoveId(null);
      router.refresh();
    } finally {
      setBusyId(null);
    }
  }

  async function handleRestore(id: string) {
    setBusyId(id);
    setActionError(null);
    try {
      const res = await fetch(`/api/journalist/portfolio/publications/${id}/restore`, {
        method: 'POST',
      });
      if (!res.ok) {
        const data = (await res.json().catch(() => null)) as
          | { error?: string }
          | null;
        setActionError(data?.error ?? 'Something went wrong. Please try again.');
        return;
      }
      router.refresh();
    } finally {
      setBusyId(null);
    }
  }

  async function handleTogglePublic() {
    if (!settings) return;
    setTogglingPublic(true);
    setActionError(null);
    try {
      const res = await fetch('/api/journalist/portfolio/settings', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ public: !settings.public }),
      });
      if (!res.ok) {
        const data = (await res.json().catch(() => null)) as
          | { error?: string }
          | null;
        setActionError(data?.error ?? 'Something went wrong. Please try again.');
        return;
      }
      router.refresh();
    } finally {
      setTogglingPublic(false);
    }
  }

  return (
    <div className="mx-auto max-w-3xl px-6 py-8">
      <div className="flex items-center justify-between">
        <h1 className="font-heading text-2xl text-text-primary">Portfolio</h1>
        <Button variant="accent" onClick={() => setModalState({ mode: 'create' })}>
          Add article
        </Button>
      </div>

      {actionError ? (
        <div
          role="alert"
          className="mt-4 rounded-lg border border-border-default bg-surface-overlay px-4 py-3 text-sm text-error"
        >
          {actionError}
        </div>
      ) : null}

      {/* Settings card */}
      <Card className="mt-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-xs font-medium text-text-secondary">
              Your public portfolio
            </p>
            {settings ? (
              <a
                href={`${appBaseUrl}/journalist/${settings.slug}`}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-1 block text-sm font-medium text-accent hover:underline"
              >
                {appBaseUrl}/journalist/{settings.slug}
              </a>
            ) : (
              <EmptyState
                compact
                heading="Not set up yet"
                body="Open settings to choose your public URL."
              />
            )}
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={handleTogglePublic}
              disabled={!settings || togglingPublic}
            >
              {settings?.public ? 'Set to private' : 'Set to public'}
            </Button>
            <Button variant="ghost" size="sm" onClick={() => setSettingsOpen(true)}>
              Edit settings
            </Button>
          </div>
        </div>
        {settings ? (
          <p className="mt-3 text-xs text-text-secondary">
            Status:{' '}
            {settings.public ? (
              <span className="font-medium text-accent">Public</span>
            ) : (
              <span className="font-medium text-text-secondary">Private</span>
            )}
          </p>
        ) : null}
      </Card>

      {/* Stats row */}
      <div className="mt-6 grid grid-cols-3 gap-4">
        <Card>
          <p className="text-2xl font-semibold text-text-primary">
            {totalArticles}
          </p>
          <p className="text-xs text-text-secondary">Total articles</p>
        </Card>
        <Card>
          <p className="text-2xl font-semibold text-text-primary">
            {distinctPublications}
          </p>
          <p className="text-xs text-text-secondary">Publications</p>
        </Card>
        <Card>
          <p className="text-2xl font-semibold text-text-primary">{thisMonth}</p>
          <p className="text-xs text-text-secondary">This month</p>
        </Card>
      </div>

      {/* Article list */}
      <section className="mt-8 space-y-4">
        {publications.length === 0 ? (
          <EmptyState
            compact
            heading="No articles published yet"
            body="Add an article to start building your public portfolio."
            action={
              <Button variant="accent" size="sm" onClick={() => setModalState({ mode: 'create' })}>
                Add article
              </Button>
            }
          />
        ) : (
          publications.map((article) => {
            const removed = Boolean(article.deleted_at);
            return (
              <Card key={article.id} className={removed ? 'opacity-60' : undefined}>
                <div className="flex items-start justify-between gap-4">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <h2 className="truncate text-lg text-text-primary">
                        <a
                          href={article.article_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="hover:underline"
                        >
                          {article.article_headline}
                        </a>
                      </h2>
                      {removed ? <Badge status="neutral">Removed</Badge> : null}
                    </div>
                    <p className="mt-1 text-sm text-text-secondary">
                      {article.publication_name} ·{' '}
                      {formatPublishedAt(article.published_at)}
                    </p>
                    {article.press_release_slug ? (
                      <Link
                        href={`/release/${article.press_release_slug}`}
                        className="mt-2 inline-block text-sm font-medium text-accent hover:underline"
                      >
                        Source release →
                      </Link>
                    ) : null}
                  </div>

                  <div className="flex shrink-0 items-center gap-2">
                    {removed ? (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleRestore(article.id)}
                        disabled={busyId === article.id}
                      >
                        Restore
                      </Button>
                    ) : (
                      <>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() =>
                            setModalState({ mode: 'edit', publication: article })
                          }
                        >
                          Edit
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setPendingRemoveId(article.id)}
                          disabled={busyId === article.id}
                        >
                          Remove
                        </Button>
                      </>
                    )}
                  </div>
                </div>
              </Card>
            );
          })
        )}
      </section>

      <LogPublicationModal
        isOpen={modalState !== null}
        onClose={() => setModalState(null)}
        publication={
          modalState?.mode === 'edit' ? modalState.publication : undefined
        }
        publicationNameSuggestions={suggestions}
        onSaved={() => router.refresh()}
      />

      <Modal
        open={pendingRemoveId !== null}
        onClose={() => setPendingRemoveId(null)}
        titleId="remove-article-title"
      >
        <div className="p-6">
          <h2
            id="remove-article-title"
            className="pr-8 font-heading text-lg text-text-primary"
          >
            Remove this article?
          </h2>
          <p className="mt-2 text-sm text-text-secondary">
            It will be removed from your public portfolio. You can restore it later.
          </p>
          <div className="mt-6 flex justify-end gap-2">
            <Button variant="ghost" size="sm" onClick={() => setPendingRemoveId(null)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              size="sm"
              loading={busyId === pendingRemoveId}
              onClick={() => void confirmRemove()}
            >
              Remove
            </Button>
          </div>
        </div>
      </Modal>

      <Modal
        open={settingsOpen}
        onClose={() => setSettingsOpen(false)}
        titleId="portfolio-settings-title"
      >
        <div className="p-6">
          <div className="flex items-center justify-between pr-8">
            <h2
              id="portfolio-settings-title"
              className="font-heading text-lg text-text-primary"
            >
              Portfolio settings
            </h2>
            <button
              type="button"
              onClick={() => setSettingsOpen(false)}
              className="rounded-lg px-2 py-1 text-sm text-text-secondary hover:text-text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2"
            >
              Close
            </button>
          </div>
          <div className="mt-5">
            <PortfolioSettingsForm
              settings={settings}
              hasEmail={hasEmail}
              appBaseUrl={appBaseUrl}
              onSaved={() => {
                setSettingsOpen(false);
                router.refresh();
              }}
            />
          </div>
        </div>
      </Modal>
    </div>
  );
}
