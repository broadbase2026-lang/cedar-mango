import { ButtonLink } from '@/components/ui/button';

const HEADLINE = 'Ready to get your story discovered?';

const JOURNALIST_CTA = {
  href: '/signup?role=journalist',
  label: "I'm a Journalist",
} as const;

const BRAND_CTA = {
  href: '/signup?role=brand',
  label: "I'm a Brand or Agency",
} as const;

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
    <section className="fade-in-container relative w-full bg-[var(--bb-top-nav)] py-16 text-brand-ink md:py-20">
      <div className="bb-container max-w-4xl">
        <h2 className="fade-in-element mb-12 text-center font-heading text-4xl font-normal md:mb-16 md:text-5xl">
          {HEADLINE}
        </h2>

        <div className="fade-in-element flex flex-col items-center justify-center gap-6 sm:flex-row">
          <ButtonLink
            href={JOURNALIST_CTA.href}
            variant="accent"
            size="lg"
            className="hover:shadow-lg focus-visible:ring-offset-[var(--bb-top-nav)]"
          >
            {JOURNALIST_CTA.label}
            <ArrowRightIcon />
          </ButtonLink>

          <ButtonLink
            href={BRAND_CTA.href}
            variant="ghost"
            size="lg"
            className="border-brand-ink hover:bg-brand-ink/10 focus-visible:ring-offset-[var(--bb-top-nav)]"
          >
            {BRAND_CTA.label}
            <ArrowRightIcon />
          </ButtonLink>
        </div>
      </div>
    </section>
  );
}
