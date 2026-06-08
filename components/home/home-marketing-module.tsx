import type { ReactNode } from 'react';
import { HOME_FEATURE_CARD_GRADIENTS } from '@/components/home/feature-card-gradients';

const HEADLINE = 'Craft the story, your way';

const SUBHEADING =
  'Journalists discover what matters. Brands reach who cares. No cold pitches. Real engagement data.';

type MarketingFeatureCard = {
  title: string;
  description: string;
  icon: ReactNode;
  gradient: string;
};

const FEATURE_CARDS: MarketingFeatureCard[] = [
  {
    title: 'Journalist-Led Discovery',
    description:
      'Journalists find your story on their terms—no email overload. Your press releases compete on merit alone.',
    icon: <SearchIcon />,
    gradient: HOME_FEATURE_CARD_GRADIENTS[0],
  },
  {
    title: 'Measurable Engagement',
    description:
      'See exactly who viewed your release, downloaded your assets, and when. Every interaction tracked in real time.',
    icon: <TrendingIcon />,
    gradient: HOME_FEATURE_CARD_GRADIENTS[1],
  },
  {
    title: 'Relationship Intelligence',
    description:
      'Build lasting media connections through patterns. Track which journalists consistently cover your vertical.',
    icon: <ConnectionIcon />,
    gradient: HOME_FEATURE_CARD_GRADIENTS[2],
  },
  {
    title: 'Confidence in Targeting',
    description:
      "Every journalist's beat is verified. Send to editors who actually cover F&B, travel, or culture—not guesswork.",
    icon: <BadgeCheckIcon />,
    gradient: HOME_FEATURE_CARD_GRADIENTS[0],
  },
];

const iconClassName = 'h-16 w-16 shrink-0 stroke-brand-primary-600';

function SearchIcon() {
  return (
    <svg
      viewBox="0 0 64 64"
      fill="none"
      aria-hidden
      className={iconClassName}
    >
      <circle cx="32" cy="32" r="28" strokeWidth="2" />
      <circle cx="28" cy="28" r="8" strokeWidth="2" />
      <path
        d="M34 34L42 42"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function TrendingIcon() {
  return (
    <svg
      viewBox="0 0 64 64"
      fill="none"
      aria-hidden
      className={iconClassName}
    >
      <circle cx="32" cy="32" r="28" strokeWidth="2" />
      <path
        d="M18 40L28 30L36 38L46 22"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M38 22H46V30"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function ConnectionIcon() {
  return (
    <svg
      viewBox="0 0 64 64"
      fill="none"
      aria-hidden
      className={iconClassName}
    >
      <circle cx="32" cy="32" r="28" strokeWidth="2" />
      <circle cx="22" cy="32" r="5" strokeWidth="2" />
      <circle cx="42" cy="22" r="5" strokeWidth="2" />
      <circle cx="42" cy="42" r="5" strokeWidth="2" />
      <path
        d="M27 32H37M39.5 25.5L37 32L39.5 38.5"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function BadgeCheckIcon() {
  return (
    <svg
      viewBox="0 0 64 64"
      fill="none"
      aria-hidden
      className={iconClassName}
    >
      <circle cx="32" cy="32" r="28" strokeWidth="2" />
      <path
        d="M22 32L29 39L42 26"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function HomeMarketingModule() {
  return (
    <section className="w-full bg-surface-page px-4 py-16 sm:px-8 sm:py-24 lg:px-16">
      <div className="mx-auto max-w-6xl">
        <div className="mb-12 text-center">
          <h2 className="font-serif text-4xl font-normal text-text-primary sm:text-5xl">
            {HEADLINE}
          </h2>
          <p className="mx-auto mt-4 max-w-2xl text-lg text-text-secondary sm:text-xl">
            {SUBHEADING}
          </p>
        </div>

        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:gap-8">
          {FEATURE_CARDS.map((card) => (
            <div key={card.title} className="group relative">
              <div
                className="pointer-events-none absolute inset-0 rounded-xl opacity-60"
                style={{ background: card.gradient, filter: 'blur(45px)' }}
                aria-hidden
              />

              <article
                className="relative z-10 flex flex-col gap-4 rounded-xl border-[3px] border-transparent p-6 shadow-media-soft transition-all duration-300 hover:shadow-lg lg:p-8"
                style={{
                  background: `linear-gradient(rgb(255 255 255), rgb(255 255 255)) padding-box, ${card.gradient} border-box`,
                }}
              >
                {card.icon}
                <h3 className="font-serif text-xl text-text-primary">
                  {card.title}
                </h3>
                <p className="text-sm leading-relaxed text-text-secondary">
                  {card.description}
                </p>
              </article>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
