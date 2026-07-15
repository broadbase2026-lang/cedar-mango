#!/usr/bin/env node
import { createAdminClient } from '@/lib/supabase/admin';
import { richTextToPlainText } from '@/lib/rich-text/sanitize';

const DEFAULT_LIMIT = 25;

function parseArgs(argv: string[]): { q: string | null; limit: number } {
  let q: string | null = null;
  let limit = DEFAULT_LIMIT;

  for (const arg of argv) {
    if (arg.startsWith('--q=')) q = arg.slice('--q='.length).trim() || null;
    if (arg.startsWith('--limit=')) {
      const n = Number(arg.slice('--limit='.length));
      if (Number.isFinite(n) && n > 0) limit = Math.min(200, Math.floor(n));
    }
  }
  for (let i = 0; i < argv.length; i++) {
    if (argv[i] === '--q') q = (argv[i + 1] ?? '').trim() || null;
    if (argv[i] === '--limit') {
      const n = Number(argv[i + 1]);
      if (Number.isFinite(n) && n > 0) limit = Math.min(200, Math.floor(n));
    }
  }

  return { q, limit };
}

function snippet(s: string, max = 220): string {
  const t = s.replace(/\s+/g, ' ').trim();
  if (t.length <= max) return t;
  return `${t.slice(0, max)}…`;
}

async function main(): Promise<void> {
  const { q, limit } = parseArgs(process.argv.slice(2));
  if (!q) {
    console.error('Error: pass --q "<title substring or slug substring>"');
    process.exit(1);
  }

  const admin = createAdminClient();
  const { data, error } = await admin
    .from('press_releases')
    .select('id, brand_id, title, slug, status, deleted_at, body, created_at')
    .or(`title.ilike.%${q}%,slug.ilike.%${q}%`)
    .order('created_at', { ascending: false })
    .limit(limit);

  if (error) throw new Error(error.message);

  const rows = data ?? [];
  console.log(`Matches: ${rows.length} (limit ${limit})`);
  for (const r of rows) {
    const body = typeof r.body === 'string' ? r.body : '';
    const plain = richTextToPlainText(body);
    const plainLen = plain.trim().length;
    const htmlTrimLen = body.trim().length;
    console.log(`\n${String(r.id)}  slug=${String(r.slug)}`);
    console.log(`  title=${String(r.title)}`);
    console.log(`  status=${String(r.status)} deleted_at=${r.deleted_at ? String(r.deleted_at) : 'null'}`);
    console.log(`  body: htmlTrimLen=${htmlTrimLen} plainTextLen=${plainLen}`);
    console.log(`  plainTextSnippet="${snippet(plain)}"`);
    console.log(`  htmlSnippet="${snippet(body)}"`);
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});

