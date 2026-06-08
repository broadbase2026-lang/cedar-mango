/** UTC calendar-quarter bounds for agency name-change auditing. */
export function calendarQuarterBoundsUTC(date: Date = new Date()): {
  start: string;
  end: string;
} {
  const year = date.getUTCFullYear();
  const quarterStartMonth = Math.floor(date.getUTCMonth() / 3) * 3;
  const start = new Date(Date.UTC(year, quarterStartMonth, 1));
  const end = new Date(Date.UTC(year, quarterStartMonth + 3, 1));
  return { start: start.toISOString(), end: end.toISOString() };
}
