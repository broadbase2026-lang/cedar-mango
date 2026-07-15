export type TitleDeleteReason =
  | 'daily_article_report'
  | 'desk_daily_report'
  | 'postmag_agenda'
  | 'postmag_period_report'
  | 'postmag_other'
  | 'weekly_sync'
  | 'reply_prefix'
  | 'fwd_prefix'
  | 'post_magazine'
  | 'delivery_status'
  | 'calendar_rsvp'
  | 'auto_reply'
  | 'out_of_office'
  | 'hr_admin'
  | 'performance_review'
  | 'editorial_pitch'
  | 'platform_notification'
  | 'invitation'
  | 'unread'
  | 'media_preview_hold'
  | 'save_the_date'
  | 'reminder_nudge'
  | 'no_subject'
  | 'very_short'
  | 'on_my_radar'
  | 'on_our_radar'
  | 'scmp';

/** Match titles the user asked to remove from mbox imports. */
export function matchDeleteTitle(title: string): TitleDeleteReason | null {
  const trimmed = title.trim();
  const t = trimmed.toLowerCase();

  if (t.includes('daily article report')) {
    return 'daily_article_report';
  }

  if (t.includes('postmag') && t.includes('agenda')) {
    return 'postmag_agenda';
  }

  if (
    t.includes('postmag') &&
    t.includes('report') &&
    (t.includes('daily') || t.includes('weekly') || t.includes('monthly'))
  ) {
    return 'postmag_period_report';
  }

  if (t.includes('postmag')) {
    return 'postmag_other';
  }

  if (/desk daily report|style desk daily/i.test(t)) {
    return 'desk_daily_report';
  }

  if (t.includes('weekly sync')) {
    return 'weekly_sync';
  }

  if (/^\s*re:/i.test(title)) {
    return 'reply_prefix';
  }

  if (/\bfwd:/i.test(t)) {
    return 'fwd_prefix';
  }

  if (t.includes('post magazine')) {
    return 'post_magazine';
  }

  if (
    /delivery status|mail delivery failed|undeliverable|returned mail|failure notice/i.test(
      t
    )
  ) {
    return 'delivery_status';
  }

  if (
    /^(accepted|declined|tentative):/i.test(trimmed) ||
    /updated (your )?access to the calendar|calendar notification|rsvp by \d/i.test(
      t
    )
  ) {
    return 'calendar_rsvp';
  }

  if (
    /automatic reply|auto[- ]?reply|away from (the )?office|i am currently out/i.test(
      t
    )
  ) {
    return 'auto_reply';
  }

  if (t.includes('out of office')) {
    return 'out_of_office';
  }

  if (
    /performance review|reimbursement scheme enrollment|rental reimbursement/i.test(
      t
    )
  ) {
    return 'performance_review';
  }

  if (
    /expense report|wallet|account summary|notice of resignation|freelance agreement|payroll|reimbursement/i.test(
      t
    )
  ) {
    return 'hr_admin';
  }

  if (
    /pitch for|story idea|media request|image request|commission inquiry|follow[- ]?up/i.test(
      t
    )
  ) {
    return 'editorial_pitch';
  }

  if (
    /you['']ve got \d+ unread|unread message|linkedin|notification from|new message from/i.test(
      t
    )
  ) {
    return 'platform_notification';
  }

  if (t.includes('invitation')) {
    return 'invitation';
  }

  if (t.includes('unread')) {
    return 'unread';
  }

  if (/media preview|media day/i.test(t) && !t.includes('invitation')) {
    return 'media_preview_hold';
  }

  if (t.includes('save the date')) {
    return 'save_the_date';
  }

  if (
    /^reminder:/i.test(trimmed) ||
    /friendly reminder|don['']t forget|last chance to/i.test(t)
  ) {
    return 'reminder_nudge';
  }

  if (/^\(no subject\)$/i.test(trimmed)) {
    return 'no_subject';
  }

  if (trimmed.length > 0 && trimmed.length < 12) {
    return 'very_short';
  }

  if (t.includes('on my radar')) {
    return 'on_my_radar';
  }

  if (t.includes('on our radar')) {
    return 'on_our_radar';
  }

  if (t.includes('scmp')) {
    return 'scmp';
  }

  return null;
}
