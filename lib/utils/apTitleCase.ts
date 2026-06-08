/**
 * Associated Press-style headline capitalization (simplified).
 * Lowercases articles, short conjunctions, and short prepositions unless first or last word.
 * Always capitalizes first and last word of the title.
 */
const SMALL_WORDS = new Set([
  'a',
  'an',
  'and',
  'as',
  'at',
  'but',
  'by',
  'for',
  'if',
  'in',
  'nor',
  'of',
  'off',
  'on',
  'or',
  'per',
  'so',
  'the',
  'to',
  'up',
  'via',
  'yet',
  'is',
  'it',
  'be',
  'no',
  'vs',
  'v',
]);

function capitalizeCore(core: string): string {
  if (!core) return core;
  const first = core.charAt(0).toUpperCase();
  const rest = core.slice(1).toLowerCase();
  return first + rest;
}

function formatSegment(
  segment: string,
  forceCapitalize: boolean,
  titleIsSingleWord: boolean
): string {
  const m = segment.match(/^([^A-Za-z0-9]*)([A-Za-z0-9][A-Za-z0-9']*)([^A-Za-z0-9]*)$/);
  if (!m) return segment;
  const [, lead, core, trail] = m;
  if (!core) return segment;

  const lower = core.toLowerCase();
  if (titleIsSingleWord || forceCapitalize) {
    return lead + capitalizeCore(core) + trail;
  }
  if (SMALL_WORDS.has(lower)) {
    return lead + lower + trail;
  }
  return lead + capitalizeCore(core) + trail;
}

/**
 * Reformats a plain-text title to AP-style title case.
 */
export function apTitleCase(input: string): string {
  const collapsed = input.trim().replace(/\s+/g, ' ');
  if (!collapsed) return '';

  const words = collapsed.split(' ');
  const n = words.length;

  return words
    .map((word, wordIndex) => {
      const isFirstWord = wordIndex === 0;
      const isLastWord = wordIndex === n - 1;
      const parts = word.split('-');

      return parts
        .map((part, hyphenIdx) => {
          const isFirstSeg = isFirstWord && hyphenIdx === 0;
          const isLastSeg = isLastWord && hyphenIdx === parts.length - 1;
          const force = isFirstSeg || isLastSeg || n === 1;
          return formatSegment(part, force, n === 1);
        })
        .join('-');
    })
    .join(' ');
}
