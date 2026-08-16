'use client';

import { useFormState, useFormStatus } from 'react-dom';
import type { PortalFeedbackActionState } from '@/lib/portal/feedback-state';
import { Button } from '@/components/ui/button';

type PortalFeedbackFormProps = {
  action: (
    prev: PortalFeedbackActionState,
    formData: FormData
  ) => Promise<PortalFeedbackActionState>;
  initialState: PortalFeedbackActionState;
  userEmail?: string;
};

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" size="sm" loading={pending}>
      {pending ? 'Sending…' : 'Send feedback'}
    </Button>
  );
}

export function PortalFeedbackForm({
  action,
  initialState,
  userEmail,
}: PortalFeedbackFormProps) {
  const [state, formAction] = useFormState(action, initialState);

  return (
    <form action={formAction} className="rounded-xl border border-brand-border bg-white p-6 shadow-sm">
      {state.success ? (
        <div
          className="mb-4 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-900"
          role="status"
        >
          Thanks — your feedback was sent to our team. We&apos;ll reply to{' '}
          {userEmail ? (
            <span className="font-medium">{userEmail}</span>
          ) : (
            'your account email'
          )}
          .
        </div>
      ) : null}

      {state.error ? (
        <div
          className="mb-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800"
          role="alert"
        >
          {state.error}
        </div>
      ) : null}

      <div className="space-y-4">
        <div className="space-y-1">
          <label
            htmlFor="feedback-message"
            className="mb-1.5 block text-xs font-medium uppercase tracking-wide text-brand-muted"
          >
            Message
          </label>
          <textarea
            id="feedback-message"
            name="message"
            required
            minLength={10}
            maxLength={5000}
            rows={8}
            disabled={state.success}
            placeholder="Tell us what’s working, what’s confusing, or what you’d like to see next."
            className="flex w-full rounded-xl bg-white px-4 py-3 text-sm text-brand-ink ring-1 ring-inset ring-brand-border shadow-sm placeholder:text-brand-muted/80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-ring disabled:opacity-60"
          />
          <p className="text-xs text-brand-muted">Max 5,000 characters</p>
        </div>

        <div className="pt-1">
          <SubmitButton />
        </div>
      </div>
    </form>
  );
}
