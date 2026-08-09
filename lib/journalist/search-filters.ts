import type { IndustryVertical } from '@/types';

export type JournalistSearchSort = 'relevance' | 'recent';

export type JournalistSearchSince = 'day' | 'week' | 'month' | 'year' | 'any';

export type JournalistSearchFilters = {
  verticals?: IndustryVertical[];
  since?: JournalistSearchSince;
  sort?: JournalistSearchSort;
};

export const JOURNALIST_SEARCH_VERTICALS: Array<{
  value: IndustryVertical;
  label: string;
}> = [
  { value: 'fnb', label: 'F&B' },
  { value: 'travel', label: 'Travel' },
  { value: 'culture', label: 'Culture' },
  { value: 'fashion', label: 'Fashion' },
  { value: 'lifestyle', label: 'Lifestyle' },
  { value: 'other', label: 'Other' },
];

const VALID_VERTICALS = new Set<IndustryVertical>(
  JOURNALIST_SEARCH_VERTICALS.map((v) => v.value)
);

const VALID_SINCE = new Set<JournalistSearchSince>(['day', 'week', 'month', 'year', 'any']);
const VALID_SORT = new Set<JournalistSearchSort>(['relevance', 'recent']);

export function parseJournalistSearchFilters(params: {
  beat?: string;
  since?: string;
  sort?: string;
}): JournalistSearchFilters {
  const filters: JournalistSearchFilters = {};

  const beatRaw = (params.beat ?? '').trim();
  if (beatRaw) {
    const verticals = beatRaw
      .split(',')
      .map((v) => v.trim().toLowerCase())
      .filter((v): v is IndustryVertical => VALID_VERTICALS.has(v as IndustryVertical));
    if (verticals.length > 0) {
      filters.verticals = Array.from(new Set(verticals));
    }
  }

  const since = (params.since ?? '').trim().toLowerCase();
  if (since && VALID_SINCE.has(since as JournalistSearchSince)) {
    filters.since = since as JournalistSearchSince;
  }

  const sort = (params.sort ?? '').trim().toLowerCase();
  if (sort && VALID_SORT.has(sort as JournalistSearchSort)) {
    filters.sort = sort as JournalistSearchSort;
  }

  return filters;
}

export function publishedAfterForSince(since: JournalistSearchSince | undefined): string | null {
  if (!since || since === 'any') return null;

  const now = Date.now();
  const offsets: Record<Exclude<JournalistSearchSince, 'any'>, number> = {
    day: 24 * 60 * 60 * 1000,
    week: 7 * 24 * 60 * 60 * 1000,
    month: 30 * 24 * 60 * 60 * 1000,
    year: 365 * 24 * 60 * 60 * 1000,
  };

  return new Date(now - offsets[since]).toISOString();
}

export function buildJournalistDiscoverUrl(
  q: string,
  filters: JournalistSearchFilters
): string {
  const params = new URLSearchParams();
  const trimmed = q.trim();
  if (trimmed) params.set('q', trimmed);

  if (filters.verticals && filters.verticals.length > 0) {
    params.set('beat', filters.verticals.join(','));
  }
  if (filters.since && filters.since !== 'any') {
    params.set('since', filters.since);
  }
  if (filters.sort && filters.sort !== 'relevance') {
    params.set('sort', filters.sort);
  }

  const qs = params.toString();
  return qs ? `/journalist/discover?${qs}` : '/journalist/discover';
}
