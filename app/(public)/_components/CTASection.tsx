import Link from 'next/link';

const HEADLINE = 'Ready to get your story discovered?';

const JOURNALIST_CTA = {
  href: '/signup?role=journalist',
  label: "I'm a Journalist",
} as const;

const BRAND_CTA = {
  href: '/signup?role=brand',
  label: "I'm a Brand or Agency",
} as const;

const ctaBaseClassName =
  'inline-flex h-12 items-center justify-center rounded-lg px-8 text-base font-medium transition-all duration-300 hover:shadow-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--bb-top-nav)]';

function ArrowRightIcon() {
  return (
    <svg
      viewBox="0 0 16 16"
      fill="none"
      aria-hidden
      className="ml-2 h-4 w-4"
    >
      <path
        d="M3 8H13M13 8L9 4M13 8L9 12"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function CTASection() {
  return (
    <section className="relative w-full bg-[var(--bb-top-nav)] px-4 py-16 text-brand-ink sm:px-8 sm:py-24 lg:px-16">
      <div className="mx-auto max-w-4xl">
        <h2 className="mb-12 text-center font-serif text-4xl font-normal sm:mb-16 sm:text-5xl">
          {HEADLINE}
        </h2>

        <div className="flex flex-col items-center justify-center gap-6 sm:flex-row">
          <Link
            href={JOURNALIST_CTA.href}
            className={`${ctaBaseClassName} bg-accent text-text-inverse shadow-media-soft hover:bg-accent-hover`}
          >
            {JOURNALIST_CTA.label}
            <ArrowRightIcon />
          </Link>

          <Link
            href={BRAND_CTA.href}
            className={`${ctaBaseClassName} border border-brand-ink bg-transparent text-brand-ink hover:bg-brand-ink/10`}
          >
            {BRAND_CTA.label}
            <ArrowRightIcon />
          </Link>
        </div>
      </div>
    </section>
  );
}
