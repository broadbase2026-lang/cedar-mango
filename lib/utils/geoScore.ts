import { GEO_SCORE_TIPS } from '@/constants/copy';

export type GeoScoreInput = {
  title: string;
  summary: string | null;
  body: string;
  tags: string[];
  heroAsset: { caption: string | null } | null;
  brandWebsite: string | null;
};

export type GeoScoreBand = 'needs-improvement' | 'good' | 'geo-ready';

export type GeoScoreResult = {
  score: number;
  band: GeoScoreBand;
  tips: string[];
};

const MAX_TIPS = 4;

function wordCount(text: string): number {
  return text.trim().split(/\s+/).filter(Boolean).length;
}

export function geoBandFromScore(score: number): GeoScoreBand {
  if (score <= 40) return 'needs-improvement';
  if (score <= 70) return 'good';
  return 'geo-ready';
}

export const GEO_SCORE_CRITERIA: {
  key: string;
  label: string;
  description: string;
  points: number;
  tipKey: keyof typeof GEO_SCORE_TIPS;
}[] = [
  {
    key: 'summary',
    label: 'Summary (150+ characters)',
    description:
      'A standalone summary gives AI tools a concise, extractable version of your announcement without needing to parse the full body.',
    points: 25,
    tipKey: 'SUMMARY_TOO_SHORT',
  },
  {
    key: 'body_length',
    label: 'Body length (500+ words)',
    description:
      'Longer, factual body copy gives AI models more signal to accurately categorise, summarise, and attribute your content.',
    points: 20,
    tipKey: 'BODY_TOO_SHORT',
  },
  {
    key: 'tags',
    label: 'Tags (5–8 specific tags)',
    description:
      'Tags are a direct input to AI topic classification. Five or more specific tags significantly improve topical matching.',
    points: 15,
    tipKey: 'TAGS_TOO_FEW',
  },
  {
    key: 'title',
    label: 'Title length (8–15 words)',
    description:
      'A descriptive title of 8–15 words is both readable as a headline and rich enough for AI keyword extraction.',
    points: 15,
    tipKey: 'TITLE_TOO_SHORT_OR_LONG',
  },
  {
    key: 'hero_caption',
    label: 'Hero image with caption',
    description:
      'A captioned hero image enables AI image search indexing and provides an additional attribution anchor for your brand.',
    points: 15,
    tipKey: 'HERO_NO_CAPTION',
  },
  {
    key: 'brand_website',
    label: 'Brand website URL',
    description:
      'A verified website URL creates a machine-readable entity link between your release and your brand, which AI systems use for confident attribution.',
    points: 10,
    tipKey: 'NO_BRAND_WEBSITE',
  },
];

export function calculateGeoReadinessScore(
  input: GeoScoreInput,
): GeoScoreResult {
  const { title, summary, body, tags, heroAsset, brandWebsite } = input;

  let score = 0;
  const tips: string[] = [];

  const summaryOk = summary !== null && summary.length >= 150;
  if (summaryOk) {
    score += 25;
  } else {
    tips.push(GEO_SCORE_TIPS.SUMMARY_TOO_SHORT);
  }

  const bodyOk = wordCount(body) >= 500;
  if (bodyOk) {
    score += 20;
  } else {
    tips.push(GEO_SCORE_TIPS.BODY_TOO_SHORT);
  }

  const tagsOk = tags.length >= 5 && tags.length <= 8;
  if (tagsOk) {
    score += 15;
  } else {
    tips.push(GEO_SCORE_TIPS.TAGS_TOO_FEW);
  }

  const titleWordCount = wordCount(title);
  const titleOk = titleWordCount >= 8 && titleWordCount <= 15;
  if (titleOk) {
    score += 15;
  } else {
    tips.push(GEO_SCORE_TIPS.TITLE_TOO_SHORT_OR_LONG);
  }

  const heroOk =
    heroAsset !== null &&
    heroAsset.caption !== null &&
    heroAsset.caption.trim().length > 0;
  if (heroOk) {
    score += 15;
  } else {
    tips.push(GEO_SCORE_TIPS.HERO_NO_CAPTION);
  }

  const websiteOk = brandWebsite !== null && brandWebsite.trim().length > 0;
  if (websiteOk) {
    score += 10;
  } else {
    tips.push(GEO_SCORE_TIPS.NO_BRAND_WEBSITE);
  }

  return {
    score,
    band: geoBandFromScore(score),
    tips: tips.slice(0, MAX_TIPS),
  };
}
