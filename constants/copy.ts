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

export const GEO_SCORE_TIPS = {
  SUMMARY_TOO_SHORT:
    'Add a summary of at least 150 characters to help AI tools extract the key announcement clearly.',
  BODY_TOO_SHORT:
    'Expand your release body to at least 500 words. Longer, factual content gives AI search engines more to work with.',
  TAGS_TOO_FEW:
    'Add at least 5 specific tags. Tags are a primary signal for AI topic classification.',
  TITLE_TOO_SHORT_OR_LONG:
    'Aim for a title of 8–15 words: descriptive enough for AI indexing, concise enough for headlines.',
  HERO_NO_CAPTION:
    'Add a caption to your hero image. Captions are indexed by AI image search and improve visual content discoverability.',
  NO_BRAND_WEBSITE:
    'Add your brand website URL in brand settings. This creates a verifiable entity link that AI search engines use to confirm brand identity.',
} as const;

export const GEO_PAGE = {
  META_TITLE: 'Generative Engine Optimisation for Press Releases | Broadbase',
  META_DESCRIPTION:
    'Learn how Broadbase makes your press releases discoverable by AI-powered search tools — and how to improve your GEO score.',

  // Hero
  EYEBROW: 'Generative Engine Optimisation',
  HERO_HEADING: 'Your press release,\nfound by AI',
  HERO_SUBHEAD:
    'Journalists and editors increasingly use AI-powered tools to research stories. Broadbase structures your press releases so those tools can find, read, and accurately surface your announcements — without you needing to do anything extra.',
  HERO_CTA_PRIMARY: 'Start for free',
  HERO_CTA_SECONDARY: 'See how releases are scored',

  // Shift section
  SHIFT_HEADING: 'Search has changed',
  SHIFT_BODY:
    'For decades, getting coverage meant appearing in Google results. Today, an editor researching a story is just as likely to open a ChatGPT window or ask Perplexity as they are to run a search. AI tools synthesise information from across the web — but only from content they can reliably read, structure, and attribute. A press release buried in a PDF attachment or sent via email blast does not exist to these tools. A well-structured release on a crawlable, machine-readable platform does.',

  // Shift stat cards
  SHIFT_CARD_1_LABEL: 'The new research workflow',
  SHIFT_CARD_1_BODY:
    'Journalists use AI assistants to surface story ideas, check facts, and identify relevant brands before reaching out. Your release needs to be in their context window.',
  SHIFT_CARD_2_LABEL: 'Attribution matters',
  SHIFT_CARD_2_BODY:
    'AI models that surface accurate information about your brand link that information back to a verifiable source. Structured metadata — brand name, website URL, publication date — creates that link.',
  SHIFT_CARD_3_LABEL: 'Pull, not push',
  SHIFT_CARD_3_BODY:
    'The best outcome is a journalist finding your release through their own research, not because you sent it to them unsolicited. GEO makes that possible at scale.',

  // What GEO means section
  WHAT_HEADING: 'What GEO means for a press release',
  WHAT_BODY:
    'Generative Engine Optimisation is the practice of structuring content so that large language models can accurately extract, summarise, and attribute it. For a press release, this means five things: a clear, descriptive headline; a concise summary that stands alone; sufficient factual body copy; specific topic tags; and a verified brand entity with a website URL. These are the signals AI systems use to decide whether your content is worth surfacing — and to whom.',
  WHAT_STRUCTURED_LABEL: 'GEO-optimised',
  WHAT_UNSTRUCTURED_LABEL: 'Not optimised',

  // Four pillars section
  PILLARS_EYEBROW: 'Platform infrastructure',
  PILLARS_HEADING: 'What Broadbase does on your behalf',
  PILLARS_SUBHEAD:
    'Every published release on Broadbase automatically benefits from four layers of AI discoverability infrastructure. You do not need to configure any of this.',
  PILLAR_1_TITLE: 'Machine-readable feeds',
  PILLAR_1_BODY:
    'Every release is included in a public JSON API feed, an RSS feed, and a dynamic XML sitemap — the three formats that AI crawlers prefer when indexing structured content.',
  PILLAR_2_TITLE: 'Schema.org structured data',
  PILLAR_2_BODY:
    'Each release page carries schema.org PressRelease JSON-LD, including a speakable specification that tells AI systems exactly which fields carry the core announcement. Brand pages carry NewsMediaOrganization markup.',
  PILLAR_3_TITLE: 'Entity linking',
  PILLAR_3_BODY:
    'Your brand name, website URL, industry vertical, and publication date are embedded as structured attributes on every release. This allows AI models to confidently attribute content to the correct brand.',
  PILLAR_4_TITLE: 'GEO sub-score with tips',
  PILLAR_4_BODY:
    'Every published release receives a GEO sub-score based on the factors you control — summary length, body depth, tag specificity, image captioning, and more — with actionable improvement suggestions.',

  // Scoring section
  SCORING_HEADING: 'How the GEO score is calculated',
  SCORING_SUBHEAD:
    'The GEO sub-score measures the factors within your control. Platform-level infrastructure (feeds, structured data, sitemaps) is applied automatically to every release regardless of score. The score helps you understand what to improve to maximise AI discoverability for your specific content.',
  SCORING_TOTAL: '100 points total',
  SCORING_BAND_LOW_LABEL: 'Needs improvement',
  SCORING_BAND_LOW_RANGE: '0–40',
  SCORING_BAND_MID_LABEL: 'Good',
  SCORING_BAND_MID_RANGE: '41–70',
  SCORING_BAND_HIGH_LABEL: 'GEO-ready',
  SCORING_BAND_HIGH_RANGE: '71–100',
  SCORING_NOTE:
    'The GEO score is calculated automatically each time you publish or update a release. It appears alongside your AI Readiness Score on your dashboard and analytics pages.',

  // Benefits section
  BENEFITS_HEADING: 'Who benefits and how',
  BENEFITS_BRAND_LABEL: 'Brand teams',
  BENEFITS_BRAND_1:
    'Coverage from journalists who discovered your release through AI-powered research — without a single cold email sent',
  BENEFITS_BRAND_2:
    'Your announcements accurately represented in AI-generated summaries and search results, with attribution back to your brand',
  BENEFITS_BRAND_3:
    'A score-based feedback loop that improves your content quality with each release',
  BENEFITS_BRAND_4:
    "Permanent, indexed URLs for every release — building a crawlable archive of your brand's public record",
  BENEFITS_AGENCY_LABEL: 'PR agencies',
  BENEFITS_AGENCY_1:
    'Demonstrate measurable AI discoverability to clients as a differentiated service — not just AVE (Advertising Value Equivalency) and clip counts',
  BENEFITS_AGENCY_2:
    'Manage multiple brand clients under one account, each with their own GEO score history and improvement trajectory',
  BENEFITS_AGENCY_3:
    'Platform-level infrastructure handles the technical layer — your team focuses on the content quality that the score reflects',
  BENEFITS_AGENCY_4:
    'Early-mover advantage in APAC markets where GEO is still an emerging discipline for lifestyle media verticals',

  // CTA section
  CTA_HEADING: 'Start improving your AI discoverability',
  CTA_BODY:
    'Create a free account and publish your first release. Your GEO sub-score is calculated on publish — you will see exactly what to improve and why.',
  CTA_PRIMARY: 'Create a free account',
  CTA_SECONDARY: 'See pricing',
  CTA_NOTE: 'No credit card required to start.',

  // Tooltip / aria labels
  SCORE_CRITERIA_ARIA: 'GEO scoring criteria',
} as const;

export const GEO_DISPLAY = {
  badgeLabel: 'GEO Score',
  panelTitle: 'GEO Score',
  tipsTitle: 'How to improve this score',
  bandLabels: {
    'needs-improvement': 'Needs improvement',
    good: 'Good',
    'geo-ready': 'GEO-ready',
  },
  notScored: {
    badge: 'Not scored',
    title: 'Not scored yet',
    body: 'This release was published before GEO scoring was available. Re-publish it to generate a GEO readiness score.',
  },
} as const;

export const RSS_FEED = {
  title: 'Broadbase — APAC Press Releases',
  description:
    'Press releases from brands and PR agencies across APAC, covering F&B, travel, hospitality, culture, and fashion.',
  language: 'en',
} as const;

// llms.txt body. `{NEXT_PUBLIC_APP_URL}` tokens are substituted at runtime in
// app/llms.txt/route.ts.
export const LLMS_TXT = {
  template: `# Broadbase
> Broadbase is a pull-based press release discovery platform for APAC lifestyle media.
> It publishes press releases from brands and PR agencies covering F&B, hospitality,
> travel, culture, and fashion verticals, with Hong Kong and Singapore as primary markets.
> Content is indexed for journalist discovery and is freely accessible to AI crawlers.

## What you will find here

Broadbase hosts press releases from verified brands and PR agencies.
Each release includes a headline, a structured summary (up to 280 characters),
tags, publication date, industry vertical, and a brand profile with website URL.
Full release body text is available on individual release pages.

## Machine-readable endpoints

- Releases JSON feed: {NEXT_PUBLIC_APP_URL}/api/v1/releases
  Paginated JSON. Query params: page (integer), vertical (fnb|travel|culture|fashion|lifestyle|other), limit (max 50).
- Individual release JSON: {NEXT_PUBLIC_APP_URL}/api/v1/releases/[slug]
- RSS feed: {NEXT_PUBLIC_APP_URL}/rss.xml (50 most recent published releases)
- XML sitemap: {NEXT_PUBLIC_APP_URL}/sitemap.xml

## Content schema

Each release in the JSON feed includes:
  slug, title, summary, published_at, updated_at, industry_vertical, tags,
  brand_name, brand_slug, brand_website, hero_image_url (nullable)

## Usage notes

Full press release body text is not included in the JSON feed.
Body text is available on individual release pages at /release/[slug].
All content is in English. Releases are from the Asia-Pacific region.
`,
} as const;
