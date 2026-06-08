const DEFAULT_LOCALE = 'en-US';

function safeDate(iso: string | null | undefined): Date | null {
  if (!iso) return null;
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return null;
  return d;
}

export function formatMonthDayShort(iso: string | null | undefined): string {
  const d = safeDate(iso);
  if (!d) return '—';
  return new Intl.DateTimeFormat(DEFAULT_LOCALE, { month: 'short', day: 'numeric' }).format(d);
}

export function formatDateLong(iso: string | null | undefined): string {
  const d = safeDate(iso);
  if (!d) return '—';
  return new Intl.DateTimeFormat(DEFAULT_LOCALE, {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  }).format(d);
}

export function formatDateMedium(iso: string | null | undefined): string {
  const d = safeDate(iso);
  if (!d) return '—';
  return new Intl.DateTimeFormat(DEFAULT_LOCALE, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  }).format(d);
}

