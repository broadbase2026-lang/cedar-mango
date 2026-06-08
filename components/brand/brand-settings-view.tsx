'use client';

import Link from 'next/link';
import { useEffect } from 'react';
import { useFormState } from 'react-dom';
import { useRouter } from 'next/navigation';
import {
  saveBrandWorkspace,
  updateAccountAvatar,
  updateAccountName,
  type SettingsActionState,
} from '@/app/(brand)/brand/settings/actions';
import type { BrandSettingsSnapshot } from '@/lib/brand/settings-data';
import {
  planDisplayLabel,
  subscriptionStatusLabel,
} from '@/lib/stripe/labels';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ProfilePhotoUploader } from '@/components/profile/profile-photo-uploader';
import { formatDateMedium } from '@/lib/utils/dates';

const VERTICAL_OPTIONS: { value: string; label: string }[] = [
  { value: 'fnb', label: 'F&B' },
  { value: 'travel', label: 'Travel' },
  { value: 'culture', label: 'Culture' },
  { value: 'fashion', label: 'Fashion' },
  { value: 'lifestyle', label: 'Lifestyle' },
  { value: 'other', label: 'Other' },
];

const initialState: SettingsActionState = { error: null };

function formatRenewal(iso: string | null): string {
  return formatDateMedium(iso);
}

const fieldLabel =
  'mb-1.5 block text-xs font-medium uppercase tracking-wide text-brand-muted';
const card =
  'rounded-xl border border-brand-border bg-white p-6 shadow-sm space-y-4';
const inputFrame = 'space-y-1';
const help = 'text-xs text-brand-muted';

const btnPrimarySm =
  'inline-flex h-9 items-center justify-center gap-2 rounded-lg bg-brand-primary px-3 text-sm font-medium ' +
  'text-white shadow-media-soft transition-colors hover:bg-brand-primary-700 ' +
  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-ring ' +
  'focus-visible:ring-offset-2 focus-visible:ring-offset-brand-surface';

const btnSecondarySm =
  'inline-flex h-9 items-center justify-center gap-2 rounded-lg bg-white px-3 text-sm font-medium ' +
  'text-brand-ink ring-1 ring-inset ring-brand-border transition-colors hover:bg-brand-surface-2 ' +
  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-ring ' +
  'focus-visible:ring-offset-2 focus-visible:ring-offset-brand-surface';

type BrandSettingsViewProps = {
  snapshot: BrandSettingsSnapshot;
  betaTrialOnly?: boolean;
};

export function BrandSettingsView({ snapshot, betaTrialOnly = false }: BrandSettingsViewProps) {
  const router = useRouter();
  const [accountState, accountAction] = useFormState(
    updateAccountName,
    initialState
  );
  const [avatarState, avatarAction] = useFormState(
    updateAccountAvatar,
    initialState
  );
  const [brandState, brandAction] = useFormState(
    saveBrandWorkspace,
    initialState
  );

  useEffect(() => {
    if (brandState.redirectTo) {
      router.push(brandState.redirectTo);
      return;
    }
    if (accountState.success || avatarState.success || brandState.success) {
      router.refresh();
    }
  }, [
    accountState.success,
    avatarState.success,
    brandState.success,
    brandState.redirectTo,
    router,
  ]);

  const { brand, subscription, profileFullName, avatarUrl, slugLocked } = snapshot;
  const hasStripeCustomer = Boolean(subscription?.stripe_customer_id);
  const canManagePortal = hasStripeCustomer && !betaTrialOnly;
  const showSubscribePlans =
    !betaTrialOnly &&
    (!subscription ||
      subscription.status === 'canceled' ||
      !hasStripeCustomer);

  return (
    <main className="bb-dash-main">
      <div className="bb-dash-inner max-w-3xl">
        <div className="mb-8">
          <h1 className="text-xl font-semibold text-brand-ink">Settings</h1>
          <p className="mt-1 text-sm text-brand-muted">
            Workspace profile, public brand details, and subscription.
          </p>
        </div>

        <div className="space-y-8">
          <section className={card}>
            <h2 className="text-base font-semibold text-brand-ink">
              Your account
            </h2>
            <p className={help}>
              How you appear in the product. Your email is managed via Supabase
              auth.
            </p>
            <div className="pt-2">
              <ProfilePhotoUploader
                initialUrl={avatarUrl}
                displayFallback={profileFullName ?? 'Account'}
                saveAvatarAction={avatarAction}
              />
              {avatarState.error && (
                <p className="text-sm text-red-600">{avatarState.error}</p>
              )}
              {avatarState.success && (
                <p className="text-sm text-emerald-700">Profile photo saved.</p>
              )}
            </div>
            <form action={accountAction} className="space-y-4 pt-2">
              <div className={inputFrame}>
                <label htmlFor="full_name" className={fieldLabel}>
                  Display name
                </label>
                <Input
                  id="full_name"
                  name="full_name"
                  defaultValue={profileFullName ?? ''}
                  required
                  autoComplete="name"
                  placeholder="Jordan Lee"
                />
              </div>
              {accountState.error && (
                <p className="text-sm text-red-600">{accountState.error}</p>
              )}
              {accountState.success && (
                <p className="text-sm text-emerald-700">Display name saved.</p>
              )}
              <Button type="submit" size="sm">
                Save account
              </Button>
            </form>
          </section>

          <section className={card}>
            <h2 className="text-base font-semibold text-brand-ink">
              Brand workspace
            </h2>
            <p className={help}>
              Used for your newsroom URL and discovery.{' '}
              {slugLocked
                ? 'Your slug is locked because you have published releases.'
                : 'Choose a unique slug before you publish.'}
            </p>
            <form action={brandAction} className="space-y-4 pt-2">
              <div className={inputFrame}>
                <label htmlFor="name" className={fieldLabel}>
                  Brand name
                </label>
                <Input
                  id="name"
                  name="name"
                  defaultValue={brand?.name ?? ''}
                  required
                  placeholder="Acme Hospitality"
                />
              </div>
              <div className={inputFrame}>
                <label htmlFor="slug" className={fieldLabel}>
                  URL slug
                </label>
                <Input
                  id="slug"
                  name="slug"
                  defaultValue={brand?.slug ?? ''}
                  required={!brand}
                  disabled={slugLocked}
                  placeholder="acme-hospitality"
                  className={slugLocked ? 'opacity-80' : ''}
                />
                <p className={help}>
                  Shown as <span className="font-mono text-xs">/newsroom/[slug]</span>
                  . Lowercase, hyphens only.
                </p>
              </div>
              <div className={inputFrame}>
                <label htmlFor="industry_vertical" className={fieldLabel}>
                  Industry vertical
                </label>
                <select
                  id="industry_vertical"
                  name="industry_vertical"
                  required
                  defaultValue={brand?.industry_vertical ?? ''}
                  className={
                    'flex h-11 w-full rounded-xl bg-white px-4 text-sm text-brand-ink ' +
                    'ring-1 ring-inset ring-brand-border shadow-sm ' +
                    'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-ring ' +
                    'disabled:cursor-not-allowed disabled:opacity-50'
                  }
                >
                  <option value="" disabled>
                    Select vertical
                  </option>
                  {VERTICAL_OPTIONS.map((o) => (
                    <option key={o.value} value={o.value}>
                      {o.label}
                    </option>
                  ))}
                </select>
              </div>
              <div className={inputFrame}>
                <label htmlFor="description" className={fieldLabel}>
                  Short description
                </label>
                <textarea
                  id="description"
                  name="description"
                  rows={4}
                  defaultValue={brand?.description ?? ''}
                  placeholder="What journalists should know about your brand in one or two sentences."
                  className={
                    'flex w-full rounded-xl bg-white px-4 py-3 text-sm text-brand-ink ' +
                    'ring-1 ring-inset ring-brand-border shadow-sm ' +
                    'placeholder:text-brand-muted/80 ' +
                    'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-ring'
                  }
                />
              </div>
              <div className={inputFrame}>
                <label htmlFor="website" className={fieldLabel}>
                  Website
                </label>
                <Input
                  id="website"
                  name="website"
                  type="url"
                  defaultValue={brand?.website ?? ''}
                  placeholder="https://example.com"
                />
              </div>
              <div className={inputFrame}>
                <label htmlFor="logo_url" className={fieldLabel}>
                  Logo URL
                </label>
                <Input
                  id="logo_url"
                  name="logo_url"
                  type="url"
                  defaultValue={brand?.logo_url ?? ''}
                  placeholder="https://…"
                />
                <p className={help}>
                  Public HTTPS image URL for now (upload flow can replace this).
                </p>
              </div>
              {brandState.error && (
                <p className="text-sm text-red-600">{brandState.error}</p>
              )}
              {brandState.success && (
                <p className="text-sm text-emerald-700">Workspace saved.</p>
              )}
              <Button type="submit" size="sm">
                {brand ? 'Save workspace' : 'Create workspace'}
              </Button>
            </form>
          </section>

          <section className={card}>
            <h2 className="text-base font-semibold text-brand-ink">
              Plan &amp; billing
            </h2>
            <p className={help}>
              Subscription is tied to your account. Changes sync from Stripe.
            </p>

            {subscription ? (
              <dl className="grid gap-3 pt-2 text-sm sm:grid-cols-2">
                <div>
                  <dt className={help}>Plan</dt>
                  <dd className="font-medium text-brand-ink">
                    {planDisplayLabel(subscription.plan)}
                  </dd>
                </div>
                <div>
                  <dt className={help}>Status</dt>
                  <dd className="font-medium text-brand-ink">
                    {subscriptionStatusLabel(subscription.status)}
                  </dd>
                </div>
                <div className="sm:col-span-2">
                  <dt className={help}>Current period ends</dt>
                  <dd className="font-medium text-brand-ink">
                    {formatRenewal(subscription.current_period_end)}
                  </dd>
                </div>
              </dl>
            ) : (
              <p className="pt-2 text-sm text-brand-muted">
                No active subscription on file. Start a plan to unlock additional
                brands and limits per your tier.
              </p>
            )}

            <div className="flex flex-col gap-3 pt-4 sm:flex-row sm:flex-wrap">
              {canManagePortal ? (
                <a href="/api/stripe/billing-portal" className={btnPrimarySm}>
                  Manage billing in Stripe
                </a>
              ) : null}
              {showSubscribePlans ? (
                <>
                  <a
                    href="/pricing"
                    className={btnSecondarySm}
                  >
                    Subscribe — Solo
                  </a>
                  <a
                    href="/pricing"
                    className={btnSecondarySm}
                  >
                    Subscribe — Growth
                  </a>
                  <a
                    href="/pricing"
                    className={btnSecondarySm}
                  >
                    Subscribe — Enterprise
                  </a>
                </>
              ) : null}
            </div>

            <p className="pt-4 text-xs text-brand-muted">
              {betaTrialOnly ? (
                <>Paid subscriptions are not available during the beta. Use your free trial or contact support to upgrade later.</>
              ) : (
                <>
                  Enable the{' '}
                  <a
                    href="https://dashboard.stripe.com/settings/billing/portal"
                    className="font-medium text-brand-primary-700 underline"
                    target="_blank"
                    rel="noreferrer"
                  >
                    Stripe Customer Portal
                  </a>{' '}
                  in your Stripe Dashboard so “Manage billing” includes payment
                  methods and invoices.
                </>
              )}
            </p>
          </section>

          <p className="text-sm text-brand-muted">
            <Link href="/dashboard/brand" className="text-brand-primary-700 hover:underline">
              ← Back to overview
            </Link>
          </p>
        </div>
      </div>
    </main>
  );
}
