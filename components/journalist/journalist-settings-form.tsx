'use client';

import { useEffect, useState } from 'react';
import { useFormState, useFormStatus } from 'react-dom';
import type { JournalistSettingsSnapshot } from '@/lib/journalist/settings-data';
import {
  updateJournalistAvatar,
  updateJournalistSettings,
  type JournalistSettingsActionState,
} from '@/app/(journalist)/journalist/settings/actions';
import { ProfilePhotoUploader } from '@/components/profile/profile-photo-uploader';

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      className="bb-btn-primary-md w-full sm:w-auto disabled:opacity-60"
      disabled={pending}
    >
      {pending ? 'Saving…' : 'Save settings'}
    </button>
  );
}

type Props = {
  snapshot: JournalistSettingsSnapshot;
};

const INITIAL_STATE: JournalistSettingsActionState = { ok: false };

export function JournalistSettingsForm({ snapshot }: Props) {
  const [state, formAction] = useFormState(updateJournalistSettings, INITIAL_STATE);
  const [avatarState, avatarAction] = useFormState(updateJournalistAvatar, INITIAL_STATE);
  const [flash, setFlash] = useState<string | null>(null);

  useEffect(() => {
    if (avatarState.ok) {
      setFlash('Saved.');
      const t = window.setTimeout(() => setFlash(null), 2500);
      return () => window.clearTimeout(t);
    }
    if (state.ok) {
      setFlash('Saved.');
      const t = window.setTimeout(() => setFlash(null), 2500);
      return () => window.clearTimeout(t);
    }
    if (avatarState.message) {
      setFlash(avatarState.message);
      const t = window.setTimeout(() => setFlash(null), 4500);
      return () => window.clearTimeout(t);
    }
    if (state.message) {
      setFlash(state.message);
      const t = window.setTimeout(() => setFlash(null), 4500);
      return () => window.clearTimeout(t);
    }
  }, [state.ok, state.message, avatarState.ok, avatarState.message]);

  return (
    <form
      action={formAction}
      className="mt-6 rounded-xl border border-brand-border bg-white p-5 shadow-sm"
    >
      {flash ? (
        <div className="mb-4 rounded-lg border border-brand-border/70 bg-brand-surface-2 px-3 py-2 text-sm text-brand-ink">
          {flash}
        </div>
      ) : null}

      <div className="mb-6">
        <ProfilePhotoUploader
          initialUrl={snapshot.avatarUrl}
          displayFallback={snapshot.fullName ?? 'Account'}
          saveAvatarAction={avatarAction}
        />
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="sm:col-span-2">
          <label className="text-xs font-medium text-brand-muted">Full name</label>
          <input
            name="fullName"
            defaultValue={snapshot.fullName ?? ''}
            className="mt-1.5 w-full rounded-lg border border-brand-border bg-white px-3 py-2 text-sm"
          />
        </div>

        <div className="sm:col-span-2">
          <label className="text-xs font-medium text-brand-muted">Publication</label>
          <input
            name="publication"
            defaultValue={snapshot.publication ?? ''}
            className="mt-1.5 w-full rounded-lg border border-brand-border bg-white px-3 py-2 text-sm"
          />
        </div>

        <div className="sm:col-span-2">
          <label className="text-xs font-medium text-brand-muted">Beats (comma-separated)</label>
          <input
            name="beats"
            defaultValue={snapshot.beats.join(', ')}
            placeholder="F&B, Travel, Culture"
            className="mt-1.5 w-full rounded-lg border border-brand-border bg-white px-3 py-2 text-sm"
          />
        </div>

        <div className="sm:col-span-2">
          <label className="text-xs font-medium text-brand-muted">LinkedIn URL</label>
          <input
            name="linkedinUrl"
            defaultValue={snapshot.linkedinUrl ?? ''}
            placeholder="https://www.linkedin.com/in/…"
            className="mt-1.5 w-full rounded-lg border border-brand-border bg-white px-3 py-2 text-sm"
          />
        </div>

        <div className="sm:col-span-2">
          <label className="text-xs font-medium text-brand-muted">Bio</label>
          <textarea
            name="bio"
            defaultValue={snapshot.bio ?? ''}
            rows={5}
            className="mt-1.5 w-full rounded-lg border border-brand-border bg-white px-3 py-2 text-sm"
          />
        </div>

        <div>
          <label className="text-xs font-medium text-brand-muted">Digest frequency</label>
          <select name="digestFrequency" defaultValue={snapshot.digestFrequency} className="bb-dash-select">
            <option value="daily">Daily</option>
            <option value="weekly">Weekly</option>
            <option value="never">Never</option>
          </select>
        </div>

        <div className="flex items-end">
          <SubmitButton />
        </div>
      </div>
    </form>
  );
}

