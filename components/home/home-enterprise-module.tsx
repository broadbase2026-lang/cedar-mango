'use client';

import Image from 'next/image';
import { ButtonLink } from '@/components/ui/button';

function cn(...parts: Array<string | undefined | false | null>) {
  return parts.filter(Boolean).join(' ');
}

export function HomeEnterpriseModule({
  eyebrow = 'Meet the founder',
  heading = 'By journalists, for journalists.',
  subheading =
    "Gavin Yeung has spent over a decade in consumer media, sifting through thousands of irrelevant pitches — and watching great stories go untold because the right journalists never saw them. That's why he founded Broadbase: because everyone deserves better.",
  ctaLabel = 'Book a demo with Gavin',
  ctaHref = '/contact',
  className,
  headingClassName,
}: {
  eyebrow?: string;
  heading?: string;
  subheading?: string;
  ctaLabel?: string;
  ctaHref?: string;
  className?: string;
  headingClassName?: string;
}) {
  return (
    <section
      className={cn(
        'fade-in-container border-t border-brand-border/70 bg-[var(--bb-top-nav)] text-brand-ink',
        className,
      )}
    >
      <div className="bb-container flex flex-col items-center justify-center gap-10 py-10 md:flex-row md:items-center md:gap-16 md:py-12 lg:gap-20">
        <div className="fade-in-element shrink-0">
          <Image
            src="/gavin%20portrait.png"
            alt="Gavin"
            width={862}
            height={1358}
            className="h-auto w-48 rounded-2xl object-cover md:w-56"
          />
        </div>

        <div className="fade-in-element min-w-0 text-left">
          <div className="text-xs font-semibold uppercase tracking-widest text-brand-ink/70">
            {eyebrow}
          </div>

          <h2
            className={cn(
              'mt-4 font-heading text-4xl font-normal tracking-tight md:text-5xl',
              headingClassName,
            )}
          >
            {heading}
          </h2>

          <p className="mt-4 max-w-2xl text-sm leading-6 text-brand-ink/80">
            {subheading}
          </p>

          <div className="mt-8">
            <ButtonLink href={ctaHref} variant="accent" size="lg">
              {ctaLabel}
            </ButtonLink>
          </div>
        </div>
      </div>
    </section>
  );
}
