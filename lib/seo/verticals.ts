import type { IndustryVertical } from '@/types';

/** Vertical hubs exposed as public archive directories (excludes `other`). */
export const ARCHIVE_DIRECTORY_VERTICALS = [
  'fnb',
  'travel',
  'culture',
  'fashion',
  'lifestyle',
] as const;

export type ArchiveDirectoryVertical =
  (typeof ARCHIVE_DIRECTORY_VERTICALS)[number];

export const VERTICAL_LABELS: Record<IndustryVertical, string> = {
  fnb: 'F&B',
  travel: 'Travel',
  culture: 'Culture',
  fashion: 'Fashion',
  lifestyle: 'Lifestyle',
  other: 'Other',
};

/** schema.org additionalType hints only — do not invent address/date fields. */
const VERTICAL_ADDITIONAL_TYPE: Partial<
  Record<IndustryVertical, string>
> = {
  fnb: 'https://schema.org/FoodEstablishment',
  travel: 'https://schema.org/TravelAgency',
  culture: 'https://schema.org/Organization',
  fashion: 'https://schema.org/Organization',
  lifestyle: 'https://schema.org/Organization',
};

export function isArchiveDirectoryVertical(
  value: string,
): value is ArchiveDirectoryVertical {
  return (ARCHIVE_DIRECTORY_VERTICALS as readonly string[]).includes(value);
}

export function labelVertical(raw: string | null | undefined): string | null {
  if (!raw) return null;
  return VERTICAL_LABELS[raw as IndustryVertical] ?? raw;
}

export function verticalAdditionalType(
  vertical: string | null | undefined,
): string | null {
  if (!vertical) return null;
  return VERTICAL_ADDITIONAL_TYPE[vertical as IndustryVertical] ?? null;
}
