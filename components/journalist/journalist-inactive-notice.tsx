import { formatDateMedium } from '@/lib/utils/dates';

type JournalistInactiveNoticeProps = {
  inactiveAt: string | null;
  scheduledDeletionAt: string | null;
};

export function JournalistInactiveNotice({
  inactiveAt,
  scheduledDeletionAt,
}: JournalistInactiveNoticeProps) {
  return (
    <main className="bb-dash-main">
      <div className="bb-dash-inner max-w-lg">
        <div className="rounded-xl border border-brand-border bg-white p-8 shadow-sm">
          <h1 className="text-xl font-semibold text-brand-ink">
            Account inactive
          </h1>
          <p className="mt-3 text-sm text-brand-muted">
            Your journalist account was deactivated because emails to your
            registered address could not be delivered.
            {inactiveAt ? (
              <>
                {' '}
                Inactive since {formatDateMedium(inactiveAt)}.
              </>
            ) : null}
          </p>
          {scheduledDeletionAt ? (
            <p className="mt-3 text-sm text-brand-muted">
              Your account and portfolio data are scheduled for permanent
              deletion on {formatDateMedium(scheduledDeletionAt)} unless you
              contact support to resolve your email address.
            </p>
          ) : null}
          <p className="mt-6 text-sm text-brand-ink">
            Email{' '}
            <a
              href="mailto:support@broadbase.app"
              className="font-medium text-brand-primary-700 underline"
            >
              support@broadbase.app
            </a>{' '}
            if you believe this is an error.
          </p>
        </div>
      </div>
    </main>
  );
}
