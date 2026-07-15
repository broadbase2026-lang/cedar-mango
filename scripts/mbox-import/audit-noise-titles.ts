#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import { createAdminClient } from '@/lib/supabase/admin';
import { matchDeleteTitle } from './delete-title-patterns';
import { fetchAllPressReleases } from './fetch-brand-releases';
import { resolvePublisherBrand } from './resolve-publisher';

const DEFAULT_PUBLISHER = 'admin@broadbase.app';
const DEFAULT_OUTPUT = path.join(
  process.cwd(),
  'scripts/mbox-import/noise-audit-report.md'
);
const MAX_SAMPLES = 12;

type ReleaseRow = {
  id: string;
  title: string;
  created_at: string | null;
};

type HeuristicRule = {
  id: string;
  label: string;
  description: string;
  suggestedPattern: string;
  test: (title: string) => boolean;
};

const HEURISTICS: HeuristicRule[] = [
  {
    id: 'desk_daily_report',
    label: 'Desk daily reports (non-PostMag)',
    description: 'Internal editorial desk reports similar to Daily Article Report.',
    suggestedPattern: 'desk daily report|style desk daily',
    test: (t) => /desk daily report|style desk daily/i.test(t),
  },
  {
    id: 'performance_review',
    label: 'HR performance reviews',
    description: 'Internal performance review and enrollment mail.',
    suggestedPattern: 'performance review|reimbursement scheme|enrollment',
    test: (t) =>
      /performance review|reimbursement scheme enrollment|rental reimbursement/i.test(
        t
      ),
  },
  {
    id: 'fwd_prefix',
    label: 'Forwarded threads',
    description: 'Email forwards (`Fwd:`), often internal thread noise.',
    suggestedPattern: 'fwd:',
    test: (t) => /\bfwd:/i.test(t),
  },
  {
    id: 'delivery_status',
    label: 'Delivery / bounce notifications',
    description: 'Mail system auto-generated delivery failure notices.',
    suggestedPattern:
      'delivery status|mail delivery failed|undeliverable|returned mail',
    test: (t) =>
      /delivery status|mail delivery failed|undeliverable|returned mail|failure notice/i.test(
        t
      ),
  },
  {
    id: 'calendar_rsvp',
    label: 'Calendar / RSVP updates',
    description: 'Meeting accept/decline and calendar access notifications.',
    suggestedPattern:
      'accepted:|declined:|tentative:|updated invitation|calendar notification',
    test: (t) =>
      /^(accepted|declined|tentative):/i.test(t.trim()) ||
      /updated (your )?access to the calendar|calendar notification|rsvp by \d/i.test(
        t
      ),
  },
  {
    id: 'auto_reply',
    label: 'Auto-replies (wording variants)',
    description: 'Out-of-office variants not caught by current `out of office` rule.',
    suggestedPattern: 'automatic reply|auto-reply|auto reply|away from',
    test: (t) =>
      /automatic reply|auto[- ]?reply|away from (the )?office|i am currently out/i.test(
        t
      ),
  },
  {
    id: 'hr_admin',
    label: 'HR / expense / admin',
    description: 'Payroll, wallet, expense, resignation, and contract mail.',
    suggestedPattern:
      'expense report|wallet|account summary|resignation|freelance agreement',
    test: (t) =>
      /expense report|wallet|account summary|notice of resignation|freelance agreement|payroll|reimbursement/i.test(
        t
      ),
  },
  {
    id: 'editorial_pitch',
    label: 'Editorial pitches / commissions',
    description: 'Internal story pitches, image requests, and follow-ups.',
    suggestedPattern:
      'pitch for|story idea|media request|image request|commission inquiry|follow-up',
    test: (t) =>
      /pitch for|story idea|media request|image request|commission inquiry|follow[- ]?up/i.test(
        t
      ),
  },
  {
    id: 'platform_notification',
    label: 'Platform / inbox notifications',
    description: 'Social and inbox notification subjects.',
    suggestedPattern: "you've got|unread message|linkedin|notification from",
    test: (t) =>
      /you['']ve got \d+ unread|unread message|linkedin|notification from|new message from/i.test(
        t
      ),
  },
  {
    id: 'postmag_other',
    label: 'PostMag (other)',
    description: 'PostMag mail not matching agenda/report rules.',
    suggestedPattern: 'postmag',
    test: (t) => /postmag/i.test(t),
  },
  {
    id: 'save_the_date',
    label: 'Save the date',
    description: 'Event holds — may be PR or internal calendar noise; review before deleting.',
    suggestedPattern: 'save the date',
    test: (t) => /save the date/i.test(t),
  },
  {
    id: 'media_preview_hold',
    label: 'Media preview / media day (no "invitation")',
    description: 'Preview invites that omit the word "invitation".',
    suggestedPattern: 'media preview|media day',
    test: (t) =>
      /media preview|media day/i.test(t) && !/invitation/i.test(t),
  },
  {
    id: 'reminder_nudge',
    label: 'Reminders / nudges',
    description: 'Reminder and chase emails.',
    suggestedPattern: 'reminder:|friendly reminder|don\'t forget',
    test: (t) =>
      /^reminder:/i.test(t.trim()) ||
      /friendly reminder|don['']t forget|last chance to/i.test(t),
  },
  {
    id: 'no_subject',
    label: 'Missing subject',
    description: 'Placeholder subject from import.',
    suggestedPattern: '(no subject)',
    test: (t) => /^\(no subject\)$/i.test(t.trim()),
  },
  {
    id: 'very_short',
    label: 'Very short title',
    description: 'Titles under 12 characters — often empty replies or stubs.',
    suggestedPattern: '(title length < 12)',
    test: (t) => t.trim().length > 0 && t.trim().length < 12,
  },
];

function parseArgs(argv: string[]): {
  publisherEmail: string;
  outputPath: string;
} {
  let publisherEmail = DEFAULT_PUBLISHER;
  let outputPath = DEFAULT_OUTPUT;

  for (let i = 0; i < argv.length; i++) {
    if (argv[i] === '--publisher-email') {
      publisherEmail = (argv[i + 1] ?? DEFAULT_PUBLISHER).trim().toLowerCase();
    }
    if (argv[i] === '--output') {
      outputPath = path.resolve(argv[i + 1] ?? DEFAULT_OUTPUT);
    }
  }

  return { publisherEmail, outputPath };
}

function topKeywords(titles: string[], limit = 25): { word: string; count: number }[] {
  const counts = new Map<string, number>();
  const stop = new Set([
    'the',
    'a',
    'an',
    'and',
    'or',
    'for',
    'to',
    'of',
    'in',
    'on',
    'at',
    'with',
    'from',
    'by',
    'is',
    'are',
    'be',
    'as',
    'it',
    'its',
    'you',
    'your',
    'we',
    'our',
    'hk',
    'hong',
    'kong',
    'new',
    'press',
    'release',
    'immediate',
    'media',
  ]);

  for (const title of titles) {
    const words = title
      .toLowerCase()
      .replace(/[^a-z0-9\s]/g, ' ')
      .split(/\s+/)
      .filter((w) => w.length >= 4 && !stop.has(w));

    for (const word of words) {
      counts.set(word, (counts.get(word) ?? 0) + 1);
    }
  }

  return [...counts.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, limit)
    .map(([word, count]) => ({ word, count }));
}

function formatReport(input: {
  generatedAt: string;
  publisherEmail: string;
  brandId: string;
  brandName: string;
  all: ReleaseRow[];
  alreadyMatched: { row: ReleaseRow; reason: string }[];
  heuristicMatches: Map<
    string,
    { rule: HeuristicRule; rows: ReleaseRow[] }
  >;
  uncategorized: ReleaseRow[];
}): string {
  const lines: string[] = [];
  const {
    generatedAt,
    publisherEmail,
    brandId,
    brandName,
    all,
    alreadyMatched,
    heuristicMatches,
    uncategorized,
  } = input;

  const heuristicTotal = [...heuristicMatches.values()].reduce(
    (n, g) => n + g.rows.length,
    0
  );

  lines.push('# Mbox import noise audit report');
  lines.push('');
  lines.push(`Generated: ${generatedAt}`);
  lines.push(`Publisher: \`${publisherEmail}\``);
  lines.push(`Brand: ${brandName} (\`${brandId}\`)`);
  lines.push('');
  lines.push('## Summary');
  lines.push('');
  lines.push(`| Metric | Count |`);
  lines.push(`|--------|------:|`);
  lines.push(`| Total releases in brand | ${all.length} |`);
  lines.push(
    `| Still in DB matching current delete rules (run hard-delete) | ${alreadyMatched.length} |`
  );
  lines.push(`| Proposed heuristic matches (review) | ${heuristicTotal} |`);
  lines.push(`| Uncategorized (no rule hit) | ${uncategorized.length} |`);
  lines.push('');
  lines.push(
    '> **Note:** Heuristic matches are suggestions only. Review samples before adding rules or running hard-delete.'
  );
  lines.push('');

  if (alreadyMatched.length > 0) {
    const byReason = new Map<string, number>();
    for (const m of alreadyMatched) {
      byReason.set(m.reason, (byReason.get(m.reason) ?? 0) + 1);
    }
    lines.push('## Pending cleanup — current delete rules still match');
    lines.push('');
    lines.push(
      'These titles match existing `delete-title-patterns.ts` rules but are still in the database (import outpacing cleanup).'
    );
    lines.push('| Rule | Count |');
    lines.push('|------|------:|');
    for (const [reason, count] of [...byReason.entries()].sort(
      (a, b) => b[1] - a[1]
    )) {
      lines.push(`| \`${reason}\` | ${count} |`);
    }
    lines.push('');
  }

  lines.push('## Proposed additional rules');
  lines.push('');

  const sortedHeuristics = [...heuristicMatches.entries()].sort(
    (a, b) => b[1].rows.length - a[1].rows.length
  );

  for (const [, group] of sortedHeuristics) {
    const { rule, rows } = group;
    if (rows.length === 0) continue;

    lines.push(`### ${rule.label} (\`${rule.id}\`) — **${rows.length}** titles`);
    lines.push('');
    lines.push(rule.description);
    lines.push('');
    lines.push(`Suggested pattern: \`${rule.suggestedPattern}\``);
    lines.push('');
    lines.push('<details>');
    lines.push(`<summary>Sample titles (${Math.min(rows.length, MAX_SAMPLES)} of ${rows.length})</summary>`);
    lines.push('');
    for (const row of rows.slice(0, MAX_SAMPLES)) {
      lines.push(`- \`${row.id}\` — ${row.title}`);
    }
    lines.push('');
    lines.push('</details>');
    lines.push('');
  }

  const uncategorizedTitles = uncategorized.map((r) => r.title);
  const keywords = topKeywords(uncategorizedTitles);

  lines.push('## Uncategorized — frequent keywords');
  lines.push('');
  lines.push(
    `Top tokens in ${uncategorized.length} titles with no current or proposed rule hit:`
  );
  lines.push('');
  lines.push('| Keyword | Count |');
  lines.push('|---------|------:|');
  for (const { word, count } of keywords) {
    lines.push(`| ${word} | ${count} |`);
  }
  lines.push('');

  lines.push('## Uncategorized — random sample');
  lines.push('');
  lines.push(
    'These may be legitimate press releases. Spot-check before broadening delete rules.'
  );
  lines.push('');

  const sampleStep = Math.max(1, Math.floor(uncategorized.length / 20));
  const samples = uncategorized.filter((_, i) => i % sampleStep === 0).slice(0, 20);
  for (const row of samples) {
    lines.push(`- \`${row.id}\` — ${row.title}`);
  }
  lines.push('');

  lines.push('## Recommended next steps');
  lines.push('');
  lines.push(
    '1. Review proposed rule sections above and approve patterns to add to `delete-title-patterns.ts`.'
  );
  lines.push(
    '2. Tighten `re:` to `^re:` (start of title) to avoid false positives like `here:`.'
  );
  lines.push(
    '3. Mirror approved rules in `shouldSkipMessage` or import-time title check to prevent re-import.'
  );
  lines.push(
    '4. Run `npm run hard-delete-mbox-noise -- --dry-run` before any live hard-delete.'
  );
  lines.push('');

  return lines.join('\n');
}

async function main(): Promise<void> {
  const { publisherEmail, outputPath } = parseArgs(process.argv.slice(2));
  const admin = createAdminClient();

  const brand = await resolvePublisherBrand({
    admin,
    publisherEmail,
    dryRun: false,
  });

  console.log(`Fetching releases for ${brand.displayName} (${brand.brandId})...`);
  const all: ReleaseRow[] = (
    await fetchAllPressReleases(admin, { brandId: brand.brandId })
  ).map((row) => ({
    id: row.id,
    title: row.title,
    created_at: null,
  }));
  console.log(`Loaded ${all.length} release(s).`);

  const alreadyMatched: { row: ReleaseRow; reason: string }[] = [];
  const remaining: ReleaseRow[] = [];

  for (const row of all) {
    const reason = matchDeleteTitle(row.title);
    if (reason) {
      alreadyMatched.push({ row, reason });
    } else {
      remaining.push(row);
    }
  }

  const heuristicMatches = new Map<
    string,
    { rule: HeuristicRule; rows: ReleaseRow[] }
  >();
  for (const rule of HEURISTICS) {
    heuristicMatches.set(rule.id, { rule, rows: [] });
  }

  const matchedByHeuristic = new Set<string>();

  for (const row of remaining) {
    for (const rule of HEURISTICS) {
      if (rule.test(row.title)) {
        heuristicMatches.get(rule.id)!.rows.push(row);
        matchedByHeuristic.add(row.id);
      }
    }
  }

  const uncategorized = remaining.filter((r) => !matchedByHeuristic.has(r.id));

  const report = formatReport({
    generatedAt: new Date().toISOString(),
    publisherEmail,
    brandId: brand.brandId,
    brandName: brand.displayName,
    all,
    alreadyMatched,
    heuristicMatches,
    uncategorized,
  });

  fs.mkdirSync(path.dirname(outputPath), { recursive: true });
  fs.writeFileSync(outputPath, report, 'utf8');

  const heuristicTotal = [...heuristicMatches.values()].reduce(
    (n, g) => n + g.rows.length,
    0
  );

  console.log(`\nAudit complete:`);
  console.log(`  Total:              ${all.length}`);
  console.log(`  Current rules:      ${alreadyMatched.length}`);
  console.log(`  Proposed heuristics: ${heuristicTotal} (may overlap across categories)`);
  console.log(`  Uncategorized:      ${uncategorized.length}`);
  console.log(`\nReport written to ${outputPath}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
