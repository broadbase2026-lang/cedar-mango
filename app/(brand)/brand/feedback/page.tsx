import { redirect } from 'next/navigation';
import { PortalFeedbackForm } from '@/components/portal/portal-feedback-form';
import { portalFeedbackInitialState } from '@/lib/portal/feedback-state';
import { submitBrandFeedbackAction } from '@/lib/portal/feedback-actions';
import { getBrandPortalSession } from '@/lib/brand/session';

export default async function BrandFeedbackPage() {
  const session = await getBrandPortalSession();
  if (!session.ok) {
    redirect('/login');
  }

  return (
    <main className="bb-dash-main">
      <div className="bb-dash-inner max-w-2xl">
        <div className="mb-8">
          <h1 className="text-xl font-semibold text-brand-ink">Feedback</h1>
          <p className="mt-1 text-sm text-brand-muted">
            Share bugs, ideas, or questions. We read every message and reply.
          </p>
        </div>

        <PortalFeedbackForm
          action={submitBrandFeedbackAction}
          initialState={portalFeedbackInitialState}
          userEmail={session.email}
        />
      </div>
    </main>
  );
}
