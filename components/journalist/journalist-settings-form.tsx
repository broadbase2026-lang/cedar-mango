'use client';

import { useEffect, useState } from 'react';
import { useFormState, useFormStatus } from 'react-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
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
    <Button
      type="submit"
      size="md"
      loading={pending}
      className="w-full sm:w-auto"
    >
      {pending ? 'Saving…' : 'Save settings'}
    </Button>
  );
}

type Props = {
  snapshot: JournalistSettingsSnapshot;
};

const INITIAL_STATE: JournalistSettingsActionState = { ok: false };

export function JournalistSettingsForm({ snapshot }: Props) {
  const [state, formAction] = useFormState(updateJournalistSettings, INITIAL_STATE);
  const [avatarState, avatarAction] = useFormState(updateJournalistAvatar, INITIAL_STATE);
  const [flash, setFlash] = useState<{ kind: 'success' | 'error'; text: string } | null>(null);

  useEffect(() => {
    if (avatarState.ok) {
      setFlash({ kind: 'success', text: 'Saved.' });
      const t = window.setTimeout(() => setFlash(null), 2500);
      return () => window.clearTimeout(t);
    }
    if (state.ok) {
      setFlash({ kind: 'success', text: 'Saved.' });
      const t = window.setTimeout(() => setFlash(null), 2500);
      return () => window.clearTimeout(t);
    }
    if (avatarState.message) {
      setFlash({ kind: 'error', text: avatarState.message });
      const t = window.setTimeout(() => setFlash(null), 4500);
      return () => window.clearTimeout(t);
    }
    if (state.message) {
      setFlash({ kind: 'error', text: state.message });
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
        <div
          className={
            flash.kind === 'success'
              ? 'mb-4 rounded-control border border-accent/30 bg-accent-subtle px-3 py-2 text-sm text-accent-hover'
              : 'mb-4 rounded-control border border-error/30 bg-error-subtle px-3 py-2 text-sm text-error'
          }
          role={flash.kind === 'error' ? 'alert' : 'status'}
        >
          {flash.text}
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
          <label htmlFor="journalist-full-name" className="text-xs font-medium text-brand-muted">Full name</label>
          <Input
            id="journalist-full-name"
            name="fullName"
            defaultValue={snapshot.fullName ?? ''}
            className="mt-1.5"
          />
        </div>

        <div className="sm:col-span-2">
          <label htmlFor="journalist-publication" className="text-xs font-medium text-brand-muted">Publication</label>
          <Input
            id="journalist-publication"
            name="publication"
            defaultValue={snapshot.publication ?? ''}
            className="mt-1.5"
          />
        </div>

        <div className="sm:col-span-2">
          <label htmlFor="journalist-beats" className="text-xs font-medium text-brand-muted">Beats (comma-separated)</label>
          <Input
            id="journalist-beats"
            name="beats"
            defaultValue={snapshot.beats.join(', ')}
            placeholder="F&B, Travel, Culture"
            className="mt-1.5"
          />
        </div>

        <div className="sm:col-span-2">
          <label htmlFor="journalist-linkedin" className="text-xs font-medium text-brand-muted">LinkedIn URL</label>
          <Input
            id="journalist-linkedin"
            name="linkedinUrl"
            defaultValue={snapshot.linkedinUrl ?? ''}
            placeholder="https://www.linkedin.com/in/…"
            className="mt-1.5"
          />
        </div>

        <div className="sm:col-span-2">
          <label htmlFor="journalist-bio" className="text-xs font-medium text-brand-muted">Bio</label>
          <Textarea
            id="journalist-bio"
            name="bio"
            defaultValue={snapshot.bio ?? ''}
            rows={5}
            className="mt-1.5"
          />
        </div>

        <div>
          <label htmlFor="journalist-digest" className="text-xs font-medium text-brand-muted">Digest frequency</label>
          <select id="journalist-digest" name="digestFrequency" defaultValue={snapshot.digestFrequency} className="bb-dash-select">
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

