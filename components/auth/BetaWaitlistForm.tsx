'use client';

import { useFormState, useFormStatus } from 'react-dom';
import { betaWaitlistAction, type BetaWaitlistActionState } from '@/app/beta-access/actions';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

function cn(...parts: Array<string | undefined | false | null>) {
  return parts.filter(Boolean).join(' ');
}

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <Button
      type="submit"
      disabled={pending}
      variant="accent"
      size="lg"
      className="h-12 w-full rounded-xl"
    >
      {pending ? 'Please wait…' : 'Sign up'}
    </Button>
  );
}

const audienceOptionClassName = cn(
  'group flex cursor-pointer items-center gap-3 rounded-xl border border-white/40 bg-white px-4 py-3.5',
  'text-sm font-semibold text-brand-ink transition-colors hover:bg-white/90',
  'has-[:checked]:border-brand-ink has-[:checked]:ring-2 has-[:checked]:ring-brand-ink/20',
);

function AudienceRadioIndicator() {
  return (
    <span
      className={cn(
        'flex h-5 w-5 shrink-0 items-center justify-center rounded-full border-2 border-brand-ink/35',
        'transition-colors group-has-[:checked]:border-accent',
      )}
      aria-hidden
    >
      <span
        className={cn(
          'h-2.5 w-2.5 rounded-full bg-accent transition-transform',
          'scale-0 group-has-[:checked]:scale-100',
        )}
      />
    </span>
  );
}

export function BetaWaitlistForm() {
  const initialState: BetaWaitlistActionState = { error: null, success: false };
  const [state, formAction] = useFormState(betaWaitlistAction, initialState);

  if (state.success) {
    return (
      <div className="rounded-xl bg-white/90 px-4 py-3 text-center text-sm text-brand-ink">
        <p className="font-medium">You&apos;re on the list.</p>
        <p className="mt-1 text-brand-muted">
          We&apos;ll email you when Broadbase is ready to share.
        </p>
      </div>
    );
  }

  return (
    <form action={formAction} className="flex w-full flex-col gap-6">
      <fieldset className="space-y-3">
        <legend className="sr-only">I am a</legend>
        <div className="flex flex-col gap-4 sm:flex-row">
          <label className={cn(audienceOptionClassName, 'sm:flex-1')}>
            <input
              type="radio"
              name="audience"
              value="journalist"
              required
              className="sr-only"
            />
            <AudienceRadioIndicator />
            Journalist
          </label>
          <label className={cn(audienceOptionClassName, 'sm:flex-1')}>
            <input
              type="radio"
              name="audience"
              value="brand"
              required
              className="sr-only"
            />
            <AudienceRadioIndicator />
            Brand
          </label>
        </div>
      </fieldset>

      <div className="space-y-1.5">
        <label htmlFor="waitlist-email" className="sr-only">
          Email
        </label>
        <Input
          id="waitlist-email"
          name="email"
          type="email"
          autoComplete="email"
          required
          placeholder="Email address"
          className="h-12 border-white/40 bg-white text-brand-ink placeholder:text-brand-muted"
        />
      </div>

      {state.error ? (
        <p className="rounded-xl bg-white/90 px-3 py-2 text-sm text-red-800" role="alert">
          {state.error}
        </p>
      ) : null}

      <SubmitButton />

      <p className="pt-1 text-center text-sm text-brand-ink/80">
        No spam, ever. Just one email when we&apos;re ready to share.
      </p>
    </form>
  );
}
