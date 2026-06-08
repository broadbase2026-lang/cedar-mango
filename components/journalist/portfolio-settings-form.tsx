'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { slugify } from '@/lib/utils/generateSlug';
import type { JournalistPortfolioSettings } from '@/types';

const SLUG_REGEX = /^[a-z0-9-]+$/;
const SLUG_TAKEN_MESSAGE =
  'That URL is already taken. Please choose a different one.';

export type PortfolioSettingsFormProps = {
  settings: JournalistPortfolioSettings | null;
  hasEmail: boolean;
  appBaseUrl: string;
  onSaved?: () => void;
};

type Status = 'idle' | 'saving' | 'success' | 'error';

export function PortfolioSettingsForm({
  settings,
  hasEmail,
  appBaseUrl,
  onSaved,
}: PortfolioSettingsFormProps) {
  const [slug, setSlug] = useState(settings?.slug ?? '');
  const [bio, setBio] = useState(settings?.bio ?? '');
  const [isPublic, setIsPublic] = useState(settings?.public ?? true);
  const [showEmail, setShowEmail] = useState(settings?.show_email ?? false);
  const [twitter, setTwitter] = useState(settings?.twitter_url ?? '');
  const [linkedin, setLinkedin] = useState(settings?.linkedin_url ?? '');
  const [website, setWebsite] = useState(settings?.website_url ?? '');

  const [slugError, setSlugError] = useState<string | null>(null);
  const [status, setStatus] = useState<Status>('idle');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  function validateSlug(value: string): boolean {
    if (value.length < 2 || value.length > 100) {
      setSlugError('URL must be between 2 and 100 characters.');
      return false;
    }
    if (!SLUG_REGEX.test(value)) {
      setSlugError(
        'URL can only contain lowercase letters, numbers, and hyphens.'
      );
      return false;
    }
    setSlugError(null);
    return true;
  }

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    if (!validateSlug(slug)) return;

    setStatus('saving');
    setErrorMsg(null);

    try {
      const res = await fetch('/api/journalist/portfolio/settings', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          slug,
          bio,
          public: isPublic,
          show_email: showEmail,
          twitter_url: twitter.trim() ? twitter.trim() : null,
          linkedin_url: linkedin.trim() ? linkedin.trim() : null,
          website_url: website.trim() ? website.trim() : null,
        }),
      });

      if (res.ok) {
        setStatus('success');
        onSaved?.();
        return;
      }

      if (res.status === 409) {
        setSlugError(SLUG_TAKEN_MESSAGE);
        setStatus('error');
        setErrorMsg(SLUG_TAKEN_MESSAGE);
      } else {
        const data = (await res.json().catch(() => null)) as
          | { error?: string }
          | null;
        setStatus('error');
        setErrorMsg(
          data?.error === 'invalid_request'
            ? 'Please check the form for errors.'
            : data?.error ?? 'Something went wrong. Please try again.'
        );
      }
    } catch {
      setStatus('error');
      setErrorMsg('Something went wrong. Please try again.');
    }
  }

  const previewSlug = slug || 'your-name';

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <div>
        <label htmlFor="pf-slug" className="text-xs font-medium text-text-secondary">
          Portfolio URL
        </label>
        <Input
          id="pf-slug"
          value={slug}
          onChange={(e) => {
            setSlug(e.target.value);
            if (slugError) setSlugError(null);
          }}
          onBlur={() => {
            if (slug) validateSlug(slug);
          }}
          placeholder="your-name"
          className="mt-1.5"
        />
        <p className="mt-1 text-xs text-text-secondary">
          {appBaseUrl}/journalist/{previewSlug}
        </p>
        {slugError ? (
          <p className="mt-1 text-xs text-error">{slugError}</p>
        ) : null}
      </div>

      <div>
        <label htmlFor="pf-bio" className="text-xs font-medium text-text-secondary">
          Bio
        </label>
        <Textarea
          id="pf-bio"
          value={bio}
          onChange={(e) => setBio(e.target.value.slice(0, 500))}
          rows={4}
          maxLength={500}
          className="mt-1.5"
        />
        <p className="mt-1 text-right text-xs text-text-secondary">
          {bio.length}/500
        </p>
      </div>

      <label className="flex items-center justify-between">
        <span className="text-sm text-text-primary">Public portfolio</span>
        <input
          type="checkbox"
          checked={isPublic}
          onChange={(e) => setIsPublic(e.target.checked)}
          className="h-4 w-4 accent-accent"
        />
      </label>

      {hasEmail ? (
        <label className="flex items-center justify-between">
          <span className="text-sm text-text-primary">Show email on portfolio</span>
          <input
            type="checkbox"
            checked={showEmail}
            onChange={(e) => setShowEmail(e.target.checked)}
            className="h-4 w-4 accent-accent"
          />
        </label>
      ) : null}

      <div>
        <label htmlFor="pf-twitter" className="text-xs font-medium text-text-secondary">
          Twitter URL
        </label>
        <Input
          id="pf-twitter"
          type="url"
          value={twitter}
          onChange={(e) => setTwitter(e.target.value)}
          placeholder="https://twitter.com/…"
          className="mt-1.5"
        />
      </div>

      <div>
        <label htmlFor="pf-linkedin" className="text-xs font-medium text-text-secondary">
          LinkedIn URL
        </label>
        <Input
          id="pf-linkedin"
          type="url"
          value={linkedin}
          onChange={(e) => setLinkedin(e.target.value)}
          placeholder="https://www.linkedin.com/in/…"
          className="mt-1.5"
        />
      </div>

      <div>
        <label htmlFor="pf-website" className="text-xs font-medium text-text-secondary">
          Website URL
        </label>
        <Input
          id="pf-website"
          type="url"
          value={website}
          onChange={(e) => setWebsite(e.target.value)}
          placeholder="https://…"
          className="mt-1.5"
        />
      </div>

      {status === 'error' && errorMsg ? (
        <p className="text-sm text-error">{errorMsg}</p>
      ) : null}
      {status === 'success' ? (
        <p className="text-sm text-accent">Saved.</p>
      ) : null}

      <div className="flex justify-end">
        <Button type="submit" variant="accent" disabled={status === 'saving'}>
          {status === 'saving' ? 'Saving…' : 'Save settings'}
        </Button>
      </div>
    </form>
  );
}
