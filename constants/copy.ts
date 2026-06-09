export const APP_NAME = 'Broadbase';

export const PLAN_DISPLAY_NAMES = {
  starter: 'Solo',
  pro: 'Growth',
  agency: 'Enterprise',
} as const;

export const PLAN_LIMITS = {
  starter: { brands: 1, releasesPerPeriod: 4, storageBytes: 5368709120 },
  pro: { brands: 10, releasesPerPeriod: 20, storageBytes: 26843545600 },
  agency: { brands: null, releasesPerPeriod: null, storageBytes: 107374182400 },
} as const;

export const TIER_FEATURES = {
  starter: {
    aiWritingAssistant: false,
    aiReadinessSuggestions: false,
    embargoScheduling: false,
    analyticsMonths: 1,
    analyticsExport: false,
  },
  pro: {
    aiWritingAssistant: true,
    aiReadinessSuggestions: true,
    embargoScheduling: true,
    analyticsMonths: 12,
    analyticsExport: false,
  },
  agency: {
    aiWritingAssistant: true,
    aiReadinessSuggestions: true,
    embargoScheduling: true,
    analyticsMonths: 12,
    analyticsExport: true,
  },
} as const;

export const ERROR_MESSAGES = {
  publishLimitReached:
    'Monthly publish limit reached for your plan. Upgrade to publish more releases this period.',
  storageLimitReached:
    'Storage limit reached for your plan. Upgrade to upload more assets or remove unused files.',
  aiNotAvailable:
    'The AI writing assistant is available on Growth and Enterprise plans.',
  embargoNotAvailable:
    'Embargo scheduling is available on Growth and Enterprise plans.',
  embargoDateMustBeFuture: 'Embargo date must be in the future.',
  embargoLiftConfirm:
    'Lift embargo? This release will become publicly visible immediately.',
  bodyTooLongForAi:
    'Press release body is too long for AI improvement. Please reduce to under 400,000 characters before using the AI assistant.',
  analyticsExportNotAvailable:
    'Analytics export is available on Enterprise plans only.',
} as const;

export const PRICING_COPY = {
  hero: {
    headline: 'Simple, transparent pricing',
    subheading: 'Publish your story. Reach the journalists who matter.',
  },
  trial: {
    banner:
      'Not ready to commit? Start with a free press release — no credit card required.',
    cta: 'Start Free Trial',
    reasonBrandLimit:
      "You've reached the brand limit on your free trial. Upgrade to add more brands.",
  },
  plans: {
    starter: {
      name: PLAN_DISPLAY_NAMES.starter,
      price: 'HK$780',
      cadence: 'per month, billed monthly',
      features: [
        `${PLAN_LIMITS.starter.brands} brand`,
        `${PLAN_LIMITS.starter.releasesPerPeriod} published releases per billing period`,
        `${(PLAN_LIMITS.starter.storageBytes / (1024 ** 3)).toFixed(0)} GB storage`,
        '30-day analytics history',
      ],
    },
    pro: {
      name: PLAN_DISPLAY_NAMES.pro,
      price: 'HK$2,340',
      cadence: 'per month, billed monthly',
      badge: 'Most Popular',
      features: [
        `${PLAN_LIMITS.pro.brands} brands`,
        `${PLAN_LIMITS.pro.releasesPerPeriod} published releases per billing period`,
        `${(PLAN_LIMITS.pro.storageBytes / (1024 ** 3)).toFixed(0)} GB storage`,
        'AI writing assistant',
        'Embargo scheduling',
        '12-month analytics history',
      ],
    },
    agency: {
      name: PLAN_DISPLAY_NAMES.agency,
      price: 'HK$6,240',
      cadence: 'per month, billed monthly',
      features: [
        'Unlimited brands',
        'Unlimited published releases',
        `${(PLAN_LIMITS.agency.storageBytes / (1024 ** 3)).toFixed(0)} GB storage`,
        'AI writing assistant',
        'Embargo scheduling',
        '12-month analytics history',
        'CSV analytics export',
        'Dedicated account manager',
      ],
    },
  },
  faq: {
    heading: 'FAQ',
    items: [
      {
        q: 'Can I change plans later?',
        a: 'Yes — upgrades take effect immediately. Downgrades apply at the next billing date.',
      },
      {
        q: 'Is there a contract or lock-in?',
        a: 'No. All plans are monthly and can be cancelled at any time.',
      },
      {
        q: 'What counts as a brand account?',
        a: 'Each brand you manage counts as one account slot.',
      },
      {
        q: 'Do you offer annual billing?',
        a: 'Annual billing with a discount is coming soon. Contact us to be notified.',
      },
    ],
  },
  footer: {
    cta: 'Still have questions?',
    contactLabel: 'Contact support',
    contactHref: 'mailto:support@broadbase.app',
  },
} as const;

export const TRIAL_COPY = {
  signupBanner:
    "You're signing up for a free trial. No credit card needed — publish your first press release on us.",
  uploadBanner:
    "You're on a free trial. Publish your first press release now — upgrade anytime to publish more.",
} as const;

export const CHECKOUT_COPY = {
  errors: {
    signInRequired: 'Sign in required.',
    journalistNotSupported: 'Subscription is not available for journalist accounts.',
    missingEmail: 'Missing account email.',
    startCheckoutGeneric: 'Unable to start checkout right now. Please try again.',
  },
} as const;

export const TRIAL_LIMIT_COPY = {
  uploadGate: {
    title: "You've used your free press release.",
    body:
      'Upgrade to a paid plan to publish more press releases and unlock full platform access.',
    primaryCta: 'View Pricing',
    secondaryCta: 'Back to Dashboard',
  },
  errors: {
    releaseLimit: 'Free trial limit reached. Upgrade to publish more press releases.',
    createDraftLimit:
      "You're on a free trial, which includes one press release. Upgrade to a paid plan to create more drafts and publish additional releases.",
  },
} as const;

export const UI_COPY = {
  errors: {
    genericTryAgain: 'Something went wrong. Please try again.',
  },
  loading: {
    redirecting: 'Redirecting…',
    starting: 'Starting…',
  },
} as const;
