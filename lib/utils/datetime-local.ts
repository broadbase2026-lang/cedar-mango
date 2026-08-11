/** Format a Date for `<input type="datetime-local">` in local timezone. */
export function toDatetimeLocalValue(date: Date): string {
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(
    date.getHours()
  )}:${pad(date.getMinutes())}`;
}

/** Parse an ISO UTC string into a datetime-local value (local timezone). */
export function isoToDatetimeLocalValue(isoUtc: string): string {
  const d = new Date(isoUtc);
  if (!Number.isFinite(d.getTime())) return '';
  return toDatetimeLocalValue(d);
}

/** Min (now + 15m) and max (+12 months) for embargo datetime-local inputs. */
export function minMaxEmbargoDatetimeLocal(): { min: string; max: string } {
  const min = new Date(Date.now() + 15 * 60 * 1000);
  const max = new Date(Date.now());
  max.setMonth(max.getMonth() + 12);
  return { min: toDatetimeLocalValue(min), max: toDatetimeLocalValue(max) };
}

/** Min (−20 years) and max (now) for backdating publish datetime-local inputs. */
export function minMaxBackdateDatetimeLocal(): { min: string; max: string } {
  const max = new Date();
  const min = new Date();
  min.setFullYear(min.getFullYear() - 20);
  return { min: toDatetimeLocalValue(min), max: toDatetimeLocalValue(max) };
}
