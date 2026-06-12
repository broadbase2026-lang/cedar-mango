import type { ReactNode } from 'react';

const HEADLINE = 'How Broadbase Works';

type ProcessStep = {
  title: string;
  description: string;
  icon: ReactNode;
};

const PROCESS_STEPS: ProcessStep[] = [
  {
    title: '1. Brands Publish',
    description:
      'Upload your press release or media kit. Our system extracts key story angles and asset inventory instantly.',
    icon: <MegaphoneIcon />,
  },
  {
    title: '2. Journalists Search',
    description:
      'Verified journalists filter by beat and discover your story. No gatekeeping. No unsolicited emails.',
    icon: <SearchSparkIcon />,
  },
  {
    title: '3. Engagement Tracked',
    description:
      'See exactly who found you, what they downloaded, how long they engaged. Real-time visibility into journalist interest.',
    icon: <TrendingChartIcon />,
  },
];

const processIconClassName = 'h-8 w-8 stroke-neutral-400';

function MegaphoneIcon() {
  return (
    <svg
      viewBox="0 0 64 64"
      fill="none"
      aria-hidden
      className={processIconClassName}
    >
      <path
        d="M18 28L42 18V46L18 36V28Z"
        strokeWidth="2"
        strokeLinejoin="round"
      />
      <path
        d="M42 24C48 26 52 30 52 32C52 34 48 38 42 40"
        strokeWidth="2"
        strokeLinecap="round"
      />
      <path
        d="M18 32H14V32C14 34.2091 15.7909 36 18 36"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M22 40V44"
        strokeWidth="2"
        strokeLinecap="round"
      />
    </svg>
  );
}

function SearchSparkIcon() {
  return (
    <svg
      viewBox="0 0 64 64"
      fill="none"
      aria-hidden
      className={processIconClassName}
    >
      <circle cx="28" cy="28" r="12" strokeWidth="2" />
      <path
        d="M37 37L46 46"
        strokeWidth="2"
        strokeLinecap="round"
      />
      <path
        d="M28 22V24M28 32V34M22 28H24M32 28H34"
        strokeWidth="2"
        strokeLinecap="round"
      />
      <path
        d="M23.5 23.5L24.8 24.8M31.2 31.2L32.5 32.5M32.5 23.5L31.2 24.8M24.8 31.2L23.5 32.5"
        strokeWidth="2"
        strokeLinecap="round"
      />
    </svg>
  );
}

function TrendingChartIcon() {
  return (
    <svg
      viewBox="0 0 64 64"
      fill="none"
      aria-hidden
      className={processIconClassName}
    >
      <path
        d="M14 44H50"
        strokeWidth="2"
        strokeLinecap="round"
      />
      <path
        d="M18 40L28 30L36 36L46 18"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M38 18H46V26"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function ProcessFlow() {
  return (
    <section className="fade-in-container bb-home-tinted-section">
      <div className="bb-home-tinted-panel bg-brand-dark">
        <div className="bb-container py-16 md:py-20">
        <h2 className="fade-in-element mb-12 text-center font-heading text-4xl font-normal text-white md:mb-16 md:text-5xl">
          {HEADLINE}
        </h2>

        <div className="grid grid-cols-1 gap-8 md:grid-cols-3 lg:gap-12">
          {PROCESS_STEPS.map((step) => (
            <div
              key={step.title}
              className="fade-in-element flex flex-col items-center gap-4 text-center"
            >
              <div className="flex h-16 w-16 items-center justify-center rounded-lg bg-neutral-800">
                {step.icon}
              </div>
              <h3 className="font-heading text-2xl text-white">{step.title}</h3>
              <p className="max-w-xs text-sm leading-relaxed text-neutral-400 sm:text-base">
                {step.description}
              </p>
            </div>
          ))}
        </div>
        </div>
      </div>
    </section>
  );
}
