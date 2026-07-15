import { describe, expect, it } from 'vitest';
import { matchDeleteTitle } from './delete-title-patterns';

describe('matchDeleteTitle', () => {
  it('matches invitation', () => {
    expect(matchDeleteTitle('[Media Invitation] Technogym')).toBe('invitation');
  });

  it('matches reply prefix at title start only', () => {
    expect(matchDeleteTitle('Re: [Media Invitation] Event')).toBe('reply_prefix');
    expect(
      matchDeleteTitle(
        "It's Different Out Here: Why Cruising is About People, Not Just Ports"
      )
    ).toBeNull();
  });

  it('matches expanded noise criteria', () => {
    expect(matchDeleteTitle('Weekly Sync - Editorial')).toBe('weekly_sync');
    expect(matchDeleteTitle('Post Magazine roundup')).toBe('post_magazine');
    expect(matchDeleteTitle('Out of Office Auto Reply')).toBe('auto_reply');
    expect(matchDeleteTitle("You've got 8 unread messages")).toBe(
      'platform_notification'
    );
    expect(matchDeleteTitle('On My Radar: Hong Kong dining')).toBe('on_my_radar');
    expect(matchDeleteTitle('On Our Radar this week')).toBe('on_our_radar');
    expect(matchDeleteTitle('SCMP Morning Brief')).toBe('scmp');
  });

  it('matches audit proposed rules', () => {
    expect(matchDeleteTitle('Fwd: Press Release Title')).toBe('fwd_prefix');
    expect(matchDeleteTitle('Delivery Status Notification (Failure)')).toBe(
      'delivery_status'
    );
    expect(matchDeleteTitle('Accepted: Gavin X Cat @ Thu 2 Apr')).toBe(
      'calendar_rsvp'
    );
    expect(matchDeleteTitle('Automatic Reply: away from office')).toBe('auto_reply');
    expect(matchDeleteTitle('Freelance Agreement for Gavin Yeung')).toBe('hr_admin');
    expect(matchDeleteTitle('📊 Fy26 Year-End Performance Review')).toBe(
      'performance_review'
    );
    expect(matchDeleteTitle('Pitch for Postmag')).toBe('postmag_other');
    expect(matchDeleteTitle('Style Desk Daily Report 2.0 - Aug 28, 2025')).toBe(
      'desk_daily_report'
    );
    expect(matchDeleteTitle('Postmag Articles')).toBe('postmag_other');
    expect(matchDeleteTitle('Save the Date | Terrible Baby Event')).toBe('save_the_date');
    expect(matchDeleteTitle('Reminder: Tasting at Ramenya Shima')).toBe('reminder_nudge');
    expect(matchDeleteTitle('[Media Preview] Futurescope Debuts')).toBe(
      'media_preview_hold'
    );
    expect(matchDeleteTitle('(No Subject)')).toBe('no_subject');
    expect(matchDeleteTitle('Thank You!')).toBe('very_short');
  });

  it('matches postmag period reports', () => {
    expect(matchDeleteTitle('Postmag Desk Daily Report 2.0 - Apr 15, 2026')).toBe(
      'postmag_period_report'
    );
    expect(matchDeleteTitle('PostMag Weekly Report — March')).toBe('postmag_period_report');
  });

  it('matches postmag agenda', () => {
    expect(matchDeleteTitle('PostMag Agenda for April')).toBe('postmag_agenda');
  });

  it('does not match unrelated press releases', () => {
    expect(matchDeleteTitle('Marco Polo Hotels Mothers Day Press Release')).toBeNull();
  });

  it('matches daily article report', () => {
    expect(matchDeleteTitle('Daily Article Report 2.0 - Apr 20, 2026')).toBe(
      'daily_article_report'
    );
  });
});
