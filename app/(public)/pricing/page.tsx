import { createClient } from '@/lib/supabase/server';
import { isBetaTrialOnly } from '@/lib/config/beta';
import { PRICING_COPY } from '@/constants/copy';
import { FadeInScroll } from '@/components/home/fade-in-scroll';
import { PublicSiteHeader } from '@/components/home/public-site-header';
import { PublicSiteFooter } from '@/components/home/public-site-footer';
import { ButtonLink } from '@/components/ui/button';
import {
  pricingAccentCtaClass,
  pricingAccentCtaInlineClass,
  pricingDisabledCtaClass,
  pricingDisabledCtaInlineClass,
} from './pricing-cta-styles';
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
        'fade-in-element relative flex h-full flex-col rounded-2xl border border-border-default bg-white p-6',
        props.badge
          ? 'shadow-media-soft ring-2 ring-accent'
          : 'shadow-sm',
      ].join(' ')}
    >
      {props.badge ? (
        <div className="absolute right-4 top-4">
          <span className="inline-flex items-center rounded-full bg-accent px-3 py-1 text-xs font-semibold text-text-inverse">
            {props.badge}
          </span>
        </div>
      ) : null}

      <div>
        <h2 className="font-heading text-xl text-text-primary">{props.name}</h2>
        <div className="mt-3">
          <div className="text-3xl font-semibold tracking-tight text-text-primary">
            {props.price}
          </div>
          <div className="mt-1 text-sm text-text-secondary">{props.cadence}</div>
        </div>
      </div>

      <ul className="mt-6 space-y-3 text-sm text-text-primary">
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
          className={pricingDisabledCtaClass}
          disabled
          title="Paid plans are not available during beta"
        >
          Beta — trial only
        </button>
      );
    }

    if (!user) {
      return (
        <ButtonLink href={`/signup?plan=${plan}`} className={pricingAccentCtaClass}>
          Get Started
        </ButtonLink>
      );
    }

    if (isJournalist) {
      return (
        <button
          type="button"
          className={pricingDisabledCtaClass}
          disabled
          title="Subscription not available for journalist accounts"
        >
          Get Started
        </button>
      );
    }

    if (!isBrand) {
      return (
        <ButtonLink href="/login" className={pricingAccentCtaClass}>
          Sign in
        </ButtonLink>
      );
    }

    if (!hasActiveSubscription) {
      return (
        <form action={createCheckoutSessionAndRedirect.bind(null, plan)}>
          <button
            type="submit"
            className={pricingAccentCtaClass}
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
          className={pricingDisabledCtaClass}
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
            className={pricingAccentCtaClass}
          >
            Upgrade
          </button>
        </form>
      );
    }

    return (
      <button
        type="button"
        className={pricingDisabledCtaClass}
        disabled
      >
        Get Started
      </button>
    );
  }

  const startTrialCta = !user ? (
    <ButtonLink href="/signup?trial=true" className={pricingAccentCtaInlineClass}>
      {PRICING_COPY.trial.cta}
    </ButtonLink>
  ) : isBrand ? (
    subscription?.trial_mode ? (
      <ButtonLink
        href="/brand/upload?trial=true"
        className={pricingAccentCtaInlineClass}
      >
        Continue Trial
      </ButtonLink>
    ) : (
      <form action={startFreeTrialAndRedirect}>
        <button type="submit" className={pricingAccentCtaInlineClass}>
          {PRICING_COPY.trial.cta}
        </button>
      </form>
    )
  ) : (
    <button
      type="button"
      className={pricingDisabledCtaInlineClass}
      title="Subscription not available for journalist accounts"
      disabled
    >
      {PRICING_COPY.trial.cta}
    </button>
  );

  return (
    <main className="min-h-screen bg-white">
      <FadeInScroll />
      <PublicSiteHeader />

      <section className="border-b border-border-default bg-white">
        <div className="bb-container pt-10 pb-6 md:pt-14 md:pb-8">
          <h1 className="font-heading text-4xl font-normal tracking-tight text-text-primary md:text-5xl">
            {PRICING_COPY.hero.headline}
          </h1>
          <p className="mt-4 max-w-2xl text-base text-text-secondary">
            {PRICING_COPY.hero.subheading}
          </p>
        </div>
      </section>

      <section className="fade-in-container pt-6 pb-10 md:pt-8 md:pb-14">
        <div className="bb-container">
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
            <div className="fade-in-element mb-8 rounded-2xl border border-neutral-200 bg-neutral-50 px-5 py-4 text-sm text-neutral-700">
              Paid subscriptions are not available during the beta. Start a free trial
              above to publish your first press release.
            </div>
          ) : null}

          <div className="fade-in-element mb-8 rounded-2xl border border-accent/30 bg-accent-subtle px-5 py-4">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <p className="text-sm font-medium text-text-primary">
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
        </div>
      </section>

      <section className="fade-in-container border-t border-border-default pb-10 md:pb-14">
        <div className="bb-container pt-10">
          <h2 className="fade-in-element font-heading text-xl text-text-primary">
            {PRICING_COPY.faq.heading}
          </h2>
          <dl className="mt-6 grid gap-6 md:grid-cols-2">
            {PRICING_COPY.faq.items.map((item) => (
              <div
                key={item.q}
                className="fade-in-element rounded-2xl border border-border-default bg-white p-5"
              >
                <dt className="text-sm font-semibold text-text-primary">
                  {item.q}
                </dt>
                <dd className="mt-2 text-sm text-text-secondary">{item.a}</dd>
              </div>
            ))}
          </dl>

          <div className="fade-in-element mt-10 text-sm text-text-secondary">
            {PRICING_COPY.footer.cta}{' '}
            <a
              href={PRICING_COPY.footer.contactHref}
              className="font-semibold text-accent underline underline-offset-4 hover:text-accent-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2"
            >
              {PRICING_COPY.footer.contactLabel}
            </a>
            .
          </div>
        </div>
      </section>

      <PublicSiteFooter />
    </main>
  );
}

