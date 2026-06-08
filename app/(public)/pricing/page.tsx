import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';
import { isBetaTrialOnly } from '@/lib/config/beta';
import { PRICING_COPY } from '@/constants/copy';
import { PublicSiteHeader } from '@/components/home/public-site-header';
import type { PricingPlan } from './actions';
import {
  createCheckoutSessionAndRedirect,
  startFreeTrialAndRedirect,
} from './actions';

function CheckIcon() {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 20 20"
      className="h-4 w-4 flex-none text-brand-primary"
      fill="currentColor"
    >
      <path
        fillRule="evenodd"
        d="M16.704 5.29a1 1 0 0 1 .006 1.415l-7.13 7.2a1 1 0 0 1-1.42.003L3.29 9.038a1 1 0 1 1 1.42-1.407l3.168 3.202 6.42-6.476a1 1 0 0 1 1.406-.067Z"
        clipRule="evenodd"
      />
    </svg>
  );
}

function TierCard(props: {
  name: string;
  price: string;
  cadence: string;
  features: string[];
  badge?: string;
  cta: React.ReactNode;
}) {
  return (
    <section
      className={[
        'relative flex h-full flex-col rounded-2xl border border-neutral-200 bg-white p-6',
        props.badge ? 'shadow-xl lg:scale-105' : 'shadow-sm',
      ].join(' ')}
    >
      {props.badge ? (
        <div className="absolute right-4 top-4">
          <span className="inline-flex items-center rounded-full bg-[#1D9E75] px-3 py-1 text-xs font-semibold text-white">
            {props.badge}
          </span>
        </div>
      ) : null}

      <div>
        <h2 className="text-lg text-neutral-900">{props.name}</h2>
        <div className="mt-3">
          <div className="text-3xl font-semibold tracking-tight text-neutral-900">
            {props.price}
          </div>
          <div className="mt-1 text-sm text-neutral-600">{props.cadence}</div>
        </div>
      </div>

      <ul className="mt-6 space-y-3 text-sm text-neutral-800">
        {props.features.map((feature) => (
          <li key={feature} className="flex gap-3">
            <CheckIcon />
            <span className="leading-6">{feature}</span>
          </li>
        ))}
      </ul>

      <div className="mt-auto pt-6">{props.cta}</div>
    </section>
  );
}

type PageProps = {
  searchParams?: Record<string, string | string[] | undefined>;
};

const PLAN_ORDER: Record<PricingPlan, number> = {
  starter: 0,
  pro: 1,
  agency: 2,
};

function firstSearchParam(
  value: string | string[] | undefined
): string | undefined {
  if (typeof value === 'string') return value;
  if (Array.isArray(value)) return value[0];
  return undefined;
}

export default async function PricingPage({ searchParams }: PageProps) {
  const reasonRaw = searchParams?.reason;
  const reason = firstSearchParam(reasonRaw);
  const checkoutError = firstSearchParam(searchParams?.checkout_error);
  const trialError = firstSearchParam(searchParams?.trial_error);

  const trialBrandLimitNotice =
    reason === 'trial_brand_limit' ? PRICING_COPY.trial.reasonBrandLimit : null;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: profile } = user
    ? await supabase
        .from('profiles')
        .select('user_type')
        .eq('id', user.id)
        .maybeSingle()
    : { data: null };

  const isBrand = profile?.user_type === 'brand';
  const isJournalist = profile?.user_type === 'journalist';

  const { data: subscription } = user
    ? await supabase
        .from('subscriptions')
        .select('plan, status, trial_mode')
        .eq('owner_id', user.id)
        .maybeSingle()
    : { data: null };

  const hasActiveSubscription =
    subscription?.status === 'active' || subscription?.status === 'trialing';

  const currentPlan = (subscription?.plan ?? null) as PricingPlan | null;

  function planButton(plan: PricingPlan) {
    if (isBetaTrialOnly) {
      return (
        <button
          type="button"
          className="w-full cursor-not-allowed rounded-xl bg-neutral-200 px-4 py-3 text-sm font-semibold text-neutral-600"
          disabled
          title="Paid plans are not available during beta"
        >
          Beta — trial only
        </button>
      );
    }

    if (!user) {
      return (
        <Link
          href={`/signup?plan=${plan}`}
          className="block w-full rounded-xl bg-[#1D9E75] px-4 py-3 text-center text-sm font-semibold text-white hover:bg-[#178c68] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1D9E75] focus-visible:ring-offset-2"
        >
          Get Started
        </Link>
      );
    }

    if (isJournalist) {
      return (
        <button
          type="button"
          className="w-full cursor-not-allowed rounded-xl bg-neutral-200 px-4 py-3 text-sm font-semibold text-neutral-600"
          disabled
          title="Subscription not available for journalist accounts"
        >
          Get Started
        </button>
      );
    }

    if (!isBrand) {
      return (
        <Link
          href="/login"
          className="block w-full rounded-xl bg-[#1D9E75] px-4 py-3 text-center text-sm font-semibold text-white hover:bg-[#178c68] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1D9E75] focus-visible:ring-offset-2"
        >
          Sign in
        </Link>
      );
    }

    if (!hasActiveSubscription) {
      return (
        <form action={createCheckoutSessionAndRedirect.bind(null, plan)}>
          <button
            type="submit"
            className="w-full rounded-xl bg-[#1D9E75] px-4 py-3 text-sm font-semibold text-white hover:bg-[#178c68] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1D9E75] focus-visible:ring-offset-2"
          >
            Get Started
          </button>
        </form>
      );
    }

    if (currentPlan === plan) {
      return (
        <button
          type="button"
          className="w-full cursor-not-allowed rounded-xl bg-neutral-200 px-4 py-3 text-sm font-semibold text-neutral-600"
          disabled
        >
          Current Plan
        </button>
      );
    }

    if (currentPlan && PLAN_ORDER[currentPlan] < PLAN_ORDER[plan]) {
      return (
        <form action={createCheckoutSessionAndRedirect.bind(null, plan)}>
          <button
            type="submit"
            className="w-full rounded-xl bg-[#1D9E75] px-4 py-3 text-sm font-semibold text-white hover:bg-[#178c68] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1D9E75] focus-visible:ring-offset-2"
          >
            Upgrade
          </button>
        </form>
      );
    }

    return (
      <button
        type="button"
        className="w-full cursor-not-allowed rounded-xl bg-neutral-200 px-4 py-3 text-sm font-semibold text-neutral-600"
        disabled
      >
        Get Started
      </button>
    );
  }

  const startTrialCta = !user ? (
    <Link href="/signup?trial=true" className="inline-flex">
      <span className="inline-flex items-center justify-center rounded-xl bg-[#1D9E75] px-4 py-2.5 text-sm font-semibold text-white hover:bg-[#178c68] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1D9E75] focus-visible:ring-offset-2">
        {PRICING_COPY.trial.cta}
      </span>
    </Link>
  ) : isBrand ? (
    subscription?.trial_mode ? (
      <Link href="/brand/upload?trial=true" className="inline-flex">
        <span className="inline-flex items-center justify-center rounded-xl bg-[#1D9E75] px-4 py-2.5 text-sm font-semibold text-white hover:bg-[#178c68] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1D9E75] focus-visible:ring-offset-2">
          Continue Trial
        </span>
      </Link>
    ) : (
      <form action={startFreeTrialAndRedirect}>
        <button
          type="submit"
          className="inline-flex items-center justify-center rounded-xl bg-[#1D9E75] px-4 py-2.5 text-sm font-semibold text-white hover:bg-[#178c68] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1D9E75] focus-visible:ring-offset-2"
        >
          {PRICING_COPY.trial.cta}
        </button>
      </form>
    )
  ) : (
    <button
      type="button"
      className="inline-flex cursor-not-allowed items-center justify-center rounded-xl bg-neutral-200 px-4 py-2.5 text-sm font-semibold text-neutral-600"
      title="Subscription not available for journalist accounts"
      disabled
    >
      {PRICING_COPY.trial.cta}
    </button>
  );

  return (
    <main className="min-h-screen bg-white">
      <PublicSiteHeader />

      <section className="border-b border-neutral-200 bg-white">
        <div className="mx-auto max-w-6xl px-6 pt-10 pb-6 md:pt-14 md:pb-8">
          <h1 className="text-4xl font-normal tracking-tight text-neutral-900 md:text-5xl">
            {PRICING_COPY.hero.headline}
          </h1>
          <p className="mt-4 max-w-2xl text-base text-neutral-600">
            {PRICING_COPY.hero.subheading}
          </p>
        </div>
      </section>

      <section className="pt-6 pb-10 md:pt-8 md:pb-14">
        <div className="mx-auto max-w-6xl px-6">
          {checkoutError ? (
            <div className="mb-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-900">
              {checkoutError}
            </div>
          ) : null}
          {trialError ? (
            <div className="mb-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-900">
              {trialError}
            </div>
          ) : null}
          {trialBrandLimitNotice ? (
            <div className="mb-4 rounded-xl border border-neutral-200 bg-white px-4 py-3 text-sm text-neutral-800">
              {trialBrandLimitNotice}
            </div>
          ) : null}

          {isBetaTrialOnly ? (
            <div className="mb-8 rounded-2xl border border-neutral-200 bg-neutral-50 px-5 py-4 text-sm text-neutral-700">
              Paid subscriptions are not available during the beta. Start a free trial
              above to publish your first press release.
            </div>
          ) : null}

          <div className="mb-8 rounded-2xl border border-[#1D9E75]/30 bg-[#1D9E75]/5 px-5 py-4">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <p className="text-sm font-medium text-neutral-900">
                {PRICING_COPY.trial.banner}
              </p>
              <div className="shrink-0">{startTrialCta}</div>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
            <TierCard
              name={PRICING_COPY.plans.starter.name}
              price={PRICING_COPY.plans.starter.price}
              cadence={PRICING_COPY.plans.starter.cadence}
              features={[...PRICING_COPY.plans.starter.features]}
              cta={planButton('starter')}
            />

            <TierCard
              name={PRICING_COPY.plans.pro.name}
              price={PRICING_COPY.plans.pro.price}
              cadence={PRICING_COPY.plans.pro.cadence}
              badge={PRICING_COPY.plans.pro.badge}
              features={[...PRICING_COPY.plans.pro.features]}
              cta={planButton('pro')}
            />

            <TierCard
              name={PRICING_COPY.plans.agency.name}
              price={PRICING_COPY.plans.agency.price}
              cadence={PRICING_COPY.plans.agency.cadence}
              features={[...PRICING_COPY.plans.agency.features]}
              cta={planButton('agency')}
            />
          </div>

          <div className="mt-14 border-t border-neutral-200 pt-10">
            <h2 className="text-lg text-neutral-900">
              {PRICING_COPY.faq.heading}
            </h2>
            <dl className="mt-6 grid gap-6 md:grid-cols-2">
              {PRICING_COPY.faq.items.map((item) => (
                <div key={item.q} className="rounded-2xl border border-neutral-200 bg-white p-5">
                  <dt className="text-sm font-semibold text-neutral-900">
                    {item.q}
                  </dt>
                  <dd className="mt-2 text-sm text-neutral-600">{item.a}</dd>
                </div>
              ))}
            </dl>

            <div className="mt-10 text-sm text-neutral-700">
              {PRICING_COPY.footer.cta}{' '}
              <a
                href={PRICING_COPY.footer.contactHref}
                className="font-semibold text-[#1D9E75] underline underline-offset-4 hover:text-[#178c68] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1D9E75] focus-visible:ring-offset-2"
              >
                {PRICING_COPY.footer.contactLabel}
              </a>
              .
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}

