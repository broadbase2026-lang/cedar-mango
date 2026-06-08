'use client';

import { useEffect, useState } from 'react';
import { Modal } from '@/components/ui/modal';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import type { JournalistPublication } from '@/types';

export type LogPublicationModalProps = {
  isOpen: boolean;
  onClose: () => void;
  pressReleaseId?: string; // undefined for manual entries
  pressReleaseTitle?: string; // pre-fills headline if provided
  // When provided, the modal edits an existing publication (PATCH) instead
  // of creating a new one (POST).
  publication?: JournalistPublication;
  // Free-text autocomplete suggestions (previously used publication names).
  publicationNameSuggestions?: string[];
  // Called after a successful save so the parent can refresh server data.
  onSaved?: () => void;
};

const DUPLICATE_MESSAGE =
  'This article has already been added to your portfolio.';
const UNREACHABLE_MESSAGE =
  'The article URL could not be reached. Please check it and try again.';

function isValidUrl(value: string): boolean {
  try {
    new URL(value);
    return true;
  } catch {
    return false;
  }
}

function toDateInputValue(iso: string): string {
  return new Date(iso).toISOString().slice(0, 10);
}

export function LogPublicationModal({
  isOpen,
  onClose,
  pressReleaseId,
  pressReleaseTitle,
  publication,
  publicationNameSuggestions = [],
  onSaved,
}: LogPublicationModalProps) {
  const isEdit = Boolean(publication);

  const [publicationName, setPublicationName] = useState('');
  const [headline, setHeadline] = useState('');
  const [url, setUrl] = useState('');
  const [publishDate, setPublishDate] = useState('');
  const [urlError, setUrlError] = useState<string | null>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [toast, setToast] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen) return;
    setPublicationName(publication?.publication_name ?? '');
    setHeadline(publication?.article_headline ?? pressReleaseTitle ?? '');
    setUrl(publication?.article_url ?? '');
    setPublishDate(
      publication
        ? toDateInputValue(publication.published_at)
        : new Date().toISOString().slice(0, 10)
    );
    setUrlError(null);
    setSubmitError(null);
  }, [isOpen, publication, pressReleaseTitle]);

  useEffect(() => {
    if (!toast) return;
    const t = window.setTimeout(() => setToast(null), 3000);
    return () => window.clearTimeout(t);
  }, [toast]);

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    if (!isValidUrl(url)) {
      setUrlError('Please enter a valid URL');
      return;
    }
    setSubmitError(null);
    setSubmitting(true);

    const publishedAtIso = new Date(publishDate).toISOString();

    try {
      const endpoint = isEdit
        ? `/api/journalist/portfolio/publications/${publication!.id}`
        : '/api/journalist/portfolio/publications';

      const payload = isEdit
        ? {
            publication_name: publicationName,
            article_headline: headline,
            article_url: url,
            published_at: publishedAtIso,
          }
        : {
            ...(pressReleaseId ? { press_release_id: pressReleaseId } : {}),
            publication_name: publicationName,
            article_headline: headline,
            article_url: url,
            published_at: publishedAtIso,
          };

      const res = await fetch(endpoint, {
        method: isEdit ? 'PATCH' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (res.ok) {
        setToast(isEdit ? 'Changes saved' : 'Added to your portfolio');
        onSaved?.();
        onClose();
        return;
      }

      if (res.status === 409) {
        setSubmitError(DUPLICATE_MESSAGE);
      } else if (res.status === 422) {
        setSubmitError(UNREACHABLE_MESSAGE);
      } else {
        const data = (await res.json().catch(() => null)) as
          | { error?: string }
          | null;
        setSubmitError(data?.error ?? 'Something went wrong. Please try again.');
      }
    } catch {
      setSubmitError('Something went wrong. Please try again.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <>
      <Modal open={isOpen}>
        <form onSubmit={handleSubmit} className="p-6">
          <h2 className="font-heading text-lg text-text-primary">
            {isEdit ? 'Edit article' : 'I published this'}
          </h2>

          <div className="mt-5 space-y-4">
            <div>
              <label
                htmlFor="lp-publication-name"
                className="text-xs font-medium text-text-secondary"
              >
                Publication name
              </label>
              <Input
                id="lp-publication-name"
                list="lp-publication-name-options"
                value={publicationName}
                onChange={(e) => setPublicationName(e.target.value)}
                placeholder="e.g. South China Morning Post"
                required
                maxLength={200}
                className="mt-1.5"
              />
              <datalist id="lp-publication-name-options">
                {publicationNameSuggestions.map((name) => (
                  <option key={name} value={name} />
                ))}
              </datalist>
            </div>

            <div>
              <label
                htmlFor="lp-headline"
                className="text-xs font-medium text-text-secondary"
              >
                Article headline
              </label>
              <Input
                id="lp-headline"
                value={headline}
                onChange={(e) => setHeadline(e.target.value)}
                required
                maxLength={500}
                className="mt-1.5"
              />
            </div>

            <div>
              <label
                htmlFor="lp-url"
                className="text-xs font-medium text-text-secondary"
              >
                Article URL
              </label>
              <Input
                id="lp-url"
                type="url"
                value={url}
                onChange={(e) => {
                  setUrl(e.target.value);
                  if (urlError) setUrlError(null);
                }}
                onBlur={() => {
                  if (url && !isValidUrl(url)) {
                    setUrlError('Please enter a valid URL');
                  }
                }}
                required
                maxLength={2000}
                className="mt-1.5"
              />
              {urlError ? (
                <p className="mt-1 text-xs text-error">{urlError}</p>
              ) : null}
            </div>

            <div>
              <label
                htmlFor="lp-date"
                className="text-xs font-medium text-text-secondary"
              >
                Publish date
              </label>
              <Input
                id="lp-date"
                type="date"
                value={publishDate}
                onChange={(e) => setPublishDate(e.target.value)}
                required
                className="mt-1.5"
              />
            </div>
          </div>

          {submitError ? (
            <p className="mt-4 text-sm text-error">{submitError}</p>
          ) : null}

          <div className="mt-6 flex justify-end gap-3">
            <Button
              type="button"
              variant="ghost"
              onClick={onClose}
              disabled={submitting}
            >
              Cancel
            </Button>
            <Button type="submit" variant="accent" disabled={submitting}>
              {submitting ? 'Saving…' : isEdit ? 'Save changes' : 'Add to portfolio'}
            </Button>
          </div>
        </form>
      </Modal>

      {toast ? (
        <div className="fixed bottom-4 right-4 z-[60] rounded-lg bg-text-primary px-4 py-3 text-sm text-text-inverse shadow-lg">
          {toast}
        </div>
      ) : null}
    </>
  );
}
