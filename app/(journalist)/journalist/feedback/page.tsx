import { redirect } from 'next/navigation';
import { PortalFeedbackForm } from '@/components/portal/portal-feedback-form';
import { portalFeedbackInitialState } from '@/lib/portal/feedback-state';
import { submitJournalistFeedbackAction } from '@/lib/portal/feedback-actions';
import { getJournalistPortalSession } from '@/lib/journalist/session';

export default async function JournalistFeedbackPage() {
  const session = await getJournalistPortalSession();
  if (!session.ok) {
    redirect('/login');
  }

  return (
    <main className="bb-dash-main">
      <div className="bb-dash-inner max-w-2xl">
        <div className="mb-8">
          <h1 className="text-xl font-semibold text-brand-ink">Feedback</h1>
          <p className="mt-1 text-sm text-brand-muted">
            Share bugs, ideas, or questions. We read every message and reply from{' '}
            <span className="font-medium text-brand-ink">help@broadbase.app</span>.
          </p>
        </div>

        <PortalFeedbackForm
          action={submitJournalistFeedbackAction}
          initialState={portalFeedbackInitialState}
          userEmail={session.email}
          userDisplayName={session.displayName}
          contextLabel={session.journalistProfile?.publication ?? null}
        />
      </div>
    </main>
  );
}
