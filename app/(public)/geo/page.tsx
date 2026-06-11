import type { Metadata } from 'next';
import Link from 'next/link';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardDescription, CardHeader } from '@/components/ui/card';
import { GEO_PAGE } from '@/constants/copy';
import { GEO_SCORE_CRITERIA } from '@/lib/utils/geoScore';

export const metadata: Metadata = {
  title: GEO_PAGE.META_TITLE,
  description: GEO_PAGE.META_DESCRIPTION,
  openGraph: {
    title: GEO_PAGE.META_TITLE,
    description: GEO_PAGE.META_DESCRIPTION,
    url: `${process.env.NEXT_PUBLIC_APP_URL}/geo`,
    siteName: 'Broadbase',
    type: 'website',
  },
  alternates: {
    canonical: `${process.env.NEXT_PUBLIC_APP_URL}/geo`,
  },
};

function HeroSection() {
  const [heroHeadingLine1, heroHeadingLine2] =
    GEO_PAGE.HERO_HEADING.split('\n');

  return (
    <section className="mx-auto max-w-3xl px-6 py-24 text-center">
      <p className="font-sans text-xs uppercase tracking-wide text-text-secondary">
        {GEO_PAGE.EYEBROW}
      </p>

      <h1 className="mt-6 font-heading text-4xl font-normal md:text-5xl">
        {heroHeadingLine1}
        <br />
        {heroHeadingLine2}
      </h1>

      <p className="mx-auto mt-6 max-w-xl font-sans text-base leading-loose text-text-secondary">
        {GEO_PAGE.HERO_SUBHEAD}
      </p>

      <div className="mt-8 flex flex-wrap justify-center gap-4">
        <Link href="/signup">
          <Button variant="accent" size="md">
            {GEO_PAGE.HERO_CTA_PRIMARY}
          </Button>
        </Link>
        <Link href="#scoring">
          <Button variant="ghost" size="md">
            {GEO_PAGE.HERO_CTA_SECONDARY}
          </Button>
        </Link>
      </div>

      <div className="mt-12 border-t border-border-default" />
    </section>
  );
}

const SHIFT_CARDS = [
  { label: GEO_PAGE.SHIFT_CARD_1_LABEL, body: GEO_PAGE.SHIFT_CARD_1_BODY },
  { label: GEO_PAGE.SHIFT_CARD_2_LABEL, body: GEO_PAGE.SHIFT_CARD_2_BODY },
  { label: GEO_PAGE.SHIFT_CARD_3_LABEL, body: GEO_PAGE.SHIFT_CARD_3_BODY },
] as const;

function ShiftSection() {
  return (
    <section className="mx-auto max-w-5xl px-6 py-16">
      <h2 className="font-heading text-3xl font-normal">
        {GEO_PAGE.SHIFT_HEADING}
      </h2>

      <p className="mt-6 max-w-2xl font-sans text-base leading-relaxed text-text-secondary">
        {GEO_PAGE.SHIFT_BODY}
      </p>

      <div className="mt-10 grid grid-cols-1 gap-6 md:grid-cols-3">
        {SHIFT_CARDS.map((card) => (
          <Card key={card.label} className="shadow-media-soft">
            <CardHeader>
              <p className="font-sans text-xs uppercase tracking-wide text-text-secondary">
                {card.label}
              </p>
              <CardDescription className="font-sans text-sm leading-relaxed text-text-primary">
                {card.body}
              </CardDescription>
            </CardHeader>
          </Card>
        ))}
      </div>
    </section>
  );
}

const OPTIMISED_PREVIEW_ROWS = ['w-3/4', 'w-full', 'w-1/2', 'w-2/3'] as const;
const UNOPTIMISED_PREVIEW_ROWS = ['w-1/3', 'w-1/4', 'w-1/2', 'w-1/5'] as const;

function ContentPreviewRow({
  dotClassName,
  barClassName,
}: {
  dotClassName: string;
  barClassName: string;
}) {
  return (
    <div className="flex items-center gap-3">
      <span className={`h-2 w-2 shrink-0 rounded-full ${dotClassName}`} />
      <span className={`h-2 rounded-full bg-neutral-200 ${barClassName}`} />
    </div>
  );
}

function WhatSection() {
  return (
    <section className="mx-auto max-w-5xl px-6 py-16">
      <div className="grid grid-cols-1 gap-12 md:grid-cols-2">
        <div>
          <h2 className="font-heading text-3xl font-normal">
            {GEO_PAGE.WHAT_HEADING}
          </h2>
          <p className="mt-6 font-sans text-base leading-relaxed text-text-secondary">
            {GEO_PAGE.WHAT_BODY}
          </p>
        </div>

        <div className="flex flex-col gap-4">
          <div className="rounded-xl border border-border-default bg-white p-5 shadow-media-soft">
            <Badge status="success">{GEO_PAGE.WHAT_STRUCTURED_LABEL}</Badge>
            <div className="mt-4 flex flex-col gap-3">
              {OPTIMISED_PREVIEW_ROWS.map((barWidth) => (
                <ContentPreviewRow
                  key={barWidth}
                  dotClassName="bg-accent"
                  barClassName={barWidth}
                />
              ))}
            </div>
          </div>

          <div className="rounded-xl border border-border-default bg-white p-5 shadow-media-soft">
            <Badge status="error">{GEO_PAGE.WHAT_UNSTRUCTURED_LABEL}</Badge>
            <div className="mt-4 flex flex-col gap-3">
              {UNOPTIMISED_PREVIEW_ROWS.map((barWidth) => (
                <ContentPreviewRow
                  key={barWidth}
                  dotClassName="bg-neutral-300"
                  barClassName={barWidth}
                />
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

function FeedsIcon() {
  return (
    <svg
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden="true"
      className="text-accent"
    >
      <path
        d="M4 6h16M4 12h12M4 18h8"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
      />
    </svg>
  );
}

function StructuredDataIcon() {
  return (
    <svg
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden="true"
      className="text-accent"
    >
      <rect
        x="5"
        y="5"
        width="14"
        height="14"
        rx="1"
        stroke="currentColor"
        strokeWidth="2"
      />
      <rect
        x="9"
        y="9"
        width="6"
        height="6"
        rx="1"
        stroke="currentColor"
        strokeWidth="2"
      />
    </svg>
  );
}

function EntityLinkIcon() {
  return (
    <svg
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden="true"
      className="text-accent"
    >
      <circle cx="7" cy="12" r="3" stroke="currentColor" strokeWidth="2" />
      <circle cx="17" cy="12" r="3" stroke="currentColor" strokeWidth="2" />
      <path d="M10 12h4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}

function GeoScoreIcon() {
  return (
    <svg
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden="true"
      className="text-accent"
    >
      <path
        d="M4 18a8 8 0 0 1 16 0"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
      />
      <path
        d="M12 18 16 10"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
      />
    </svg>
  );
}

const PILLARS = [
  {
    title: GEO_PAGE.PILLAR_1_TITLE,
    body: GEO_PAGE.PILLAR_1_BODY,
    Icon: FeedsIcon,
  },
  {
    title: GEO_PAGE.PILLAR_2_TITLE,
    body: GEO_PAGE.PILLAR_2_BODY,
    Icon: StructuredDataIcon,
  },
  {
    title: GEO_PAGE.PILLAR_3_TITLE,
    body: GEO_PAGE.PILLAR_3_BODY,
    Icon: EntityLinkIcon,
  },
  {
    title: GEO_PAGE.PILLAR_4_TITLE,
    body: GEO_PAGE.PILLAR_4_BODY,
    Icon: GeoScoreIcon,
  },
] as const;

function PillarsSection() {
  return (
    <section className="mx-auto max-w-5xl px-6 py-16">
      <div className="rounded-2xl bg-surface-raised px-8 py-12">
        <p className="font-sans text-xs uppercase tracking-wide text-text-secondary">
          {GEO_PAGE.PILLARS_EYEBROW}
        </p>

        <h2 className="mt-3 font-heading text-3xl font-normal">
          {GEO_PAGE.PILLARS_HEADING}
        </h2>

        <p className="mt-4 max-w-2xl font-sans text-base text-text-secondary">
          {GEO_PAGE.PILLARS_SUBHEAD}
        </p>

        <div className="mt-8 grid grid-cols-1 gap-6 sm:grid-cols-2">
          {PILLARS.map(({ title, body, Icon }) => (
            <Card key={title} className="rounded-xl p-6 shadow-media-soft">
              <Icon />
              <h3 className="mt-3 font-heading text-lg font-normal">{title}</h3>
              <p className="mt-2 font-sans text-sm leading-relaxed text-text-secondary">
                {body}
              </p>
            </Card>
          ))}
        </div>
      </div>
    </section>
  );
}

const SCORE_BANDS = [
  {
    status: 'error' as const,
    range: GEO_PAGE.SCORING_BAND_LOW_RANGE,
    label: GEO_PAGE.SCORING_BAND_LOW_LABEL,
  },
  {
    status: 'warning' as const,
    range: GEO_PAGE.SCORING_BAND_MID_RANGE,
    label: GEO_PAGE.SCORING_BAND_MID_LABEL,
  },
  {
    status: 'success' as const,
    range: GEO_PAGE.SCORING_BAND_HIGH_RANGE,
    label: GEO_PAGE.SCORING_BAND_HIGH_LABEL,
  },
] as const;

function ScoringSection() {
  return (
    <section id="scoring" className="mx-auto max-w-5xl px-6 py-16">
      <h2 className="font-heading text-3xl font-normal">
        {GEO_PAGE.SCORING_HEADING}
      </h2>

      <p className="mt-4 max-w-2xl font-sans text-base leading-relaxed text-text-secondary">
        {GEO_PAGE.SCORING_SUBHEAD}
      </p>

      <div className="mt-6 mb-8 flex flex-wrap gap-3">
        {SCORE_BANDS.map((band) => (
          <Badge key={band.range} status={band.status}>
            {band.range} — {band.label}
          </Badge>
        ))}
      </div>

      <div aria-label={GEO_PAGE.SCORE_CRITERIA_ARIA}>
        {GEO_SCORE_CRITERIA.map((criterion) => (
          <div
            key={criterion.key}
            className="flex items-start gap-4 border-b border-border-default py-4 last:border-0"
          >
            <Badge status="neutral" className="tabular-nums">
              +{criterion.points} pts
            </Badge>
            <div className="min-w-0 flex-1">
              <p className="font-sans text-sm font-medium text-text-primary">
                {criterion.label}
              </p>
              <p className="mt-0.5 font-sans text-xs leading-relaxed text-text-secondary">
                {criterion.description}
              </p>
            </div>
          </div>
        ))}
      </div>

      <div className="mt-6 border-t border-border-default pt-6">
        <p className="font-sans text-sm font-medium text-text-primary">
          {GEO_PAGE.SCORING_TOTAL}
        </p>
        <p className="mt-2 font-sans text-xs text-text-secondary">
          {GEO_PAGE.SCORING_NOTE}
        </p>
      </div>
    </section>
  );
}

function CheckmarkIcon() {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden="true"
      className="shrink-0 text-accent"
    >
      <path
        d="M4 12 8 16 20 4"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

const BRAND_BENEFITS = [
  GEO_PAGE.BENEFITS_BRAND_1,
  GEO_PAGE.BENEFITS_BRAND_2,
  GEO_PAGE.BENEFITS_BRAND_3,
  GEO_PAGE.BENEFITS_BRAND_4,
] as const;

const AGENCY_BENEFITS = [
  GEO_PAGE.BENEFITS_AGENCY_1,
  GEO_PAGE.BENEFITS_AGENCY_2,
  GEO_PAGE.BENEFITS_AGENCY_3,
  GEO_PAGE.BENEFITS_AGENCY_4,
] as const;

function BenefitsSection() {
  return (
    <section className="mx-auto max-w-5xl px-6 py-16">
      <h2 className="text-center font-heading text-3xl font-normal">
        {GEO_PAGE.BENEFITS_HEADING}
      </h2>

      <div className="mt-10 grid grid-cols-1 gap-8 md:grid-cols-2">
        <Card className="rounded-xl p-8 shadow-media-soft">
          <div className="mb-6 h-1 rounded-full bg-primary-base" />
          <h3 className="font-heading text-xl font-normal">
            {GEO_PAGE.BENEFITS_BRAND_LABEL}
          </h3>
          <ul className="mt-6 space-y-4">
            {BRAND_BENEFITS.map((benefit) => (
              <li key={benefit} className="flex items-start gap-3">
                <CheckmarkIcon />
                <span className="font-sans text-sm leading-relaxed text-text-primary">
                  {benefit}
                </span>
              </li>
            ))}
          </ul>
        </Card>

        <Card className="rounded-xl p-8 shadow-media-soft">
          <div className="mb-6 h-1 rounded-full bg-accent" />
          <h3 className="font-heading text-xl font-normal">
            {GEO_PAGE.BENEFITS_AGENCY_LABEL}
          </h3>
          <ul className="mt-6 space-y-4">
            {AGENCY_BENEFITS.map((benefit) => (
              <li key={benefit} className="flex items-start gap-3">
                <CheckmarkIcon />
                <span className="font-sans text-sm leading-relaxed text-text-primary">
                  {benefit}
                </span>
              </li>
            ))}
          </ul>
        </Card>
      </div>
    </section>
  );
}

function CtaSection() {
  return (
    <section className="mx-auto max-w-2xl px-6 py-24 text-center">
      <h2 className="font-heading text-3xl font-normal">
        {GEO_PAGE.CTA_HEADING}
      </h2>

      <p className="mt-4 font-sans text-base leading-relaxed text-text-secondary">
        {GEO_PAGE.CTA_BODY}
      </p>

      <div className="mt-8 flex flex-wrap justify-center gap-4">
        <Link href="/signup">
          <Button variant="accent" size="md">
            {GEO_PAGE.CTA_PRIMARY}
          </Button>
        </Link>
        <Link href="/pricing">
          <Button variant="ghost" size="md">
            {GEO_PAGE.CTA_SECONDARY}
          </Button>
        </Link>
      </div>

      <p className="mt-4 font-sans text-xs text-text-secondary">
        {GEO_PAGE.CTA_NOTE}
      </p>

      <div className="mt-16 border-t border-border-default" />
    </section>
  );
}

export default function GeoPage() {
  return (
    <div data-side="brand" className="min-h-screen bg-surface-page">
      <HeroSection />
      <ShiftSection />
      <WhatSection />
      <PillarsSection />
      <ScoringSection />
      <BenefitsSection />
      <CtaSection />
    </div>
  );
}
