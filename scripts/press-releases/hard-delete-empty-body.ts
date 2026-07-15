#!/usr/bin/env node
import type { SupabaseClient } from '@supabase/supabase-js';
import { createAdminClient } from '@/lib/supabase/admin';
import { richTextToPlainText } from '@/lib/rich-text/sanitize';
import { assertScriptMutationsAllowed } from '@/scripts/lib/script-env-guard';
import { resolvePublisherBrand } from '@/scripts/mbox-import/resolve-publisher';

const DELETE_CHUNK_SIZE = 200;
const PAGE_SIZE = 1000;
const SAMPLE_LIMIT = 15;

type ReleaseRow = {
  id: string;
  title: string;
  body: string;
  deleted_at: string | null;
};

function parseArgs(argv: string[]): {
  dryRun: boolean;
  publisherEmail: string | null;
  allBrands: boolean;
} {
  let dryRun = false;
  let publisherEmail: string | null = null;
  let allBrands = false;

  for (const arg of argv) {
    if (arg === '--dry-run') dryRun = true;
    if (arg === '--all-brands') allBrands = true;
    if (arg.startsWith('--publisher-email=')) {
      publisherEmail = arg.slice('--publisher-email='.length).trim().toLowerCase() || null;
    }
  }
  for (let i = 0; i < argv.length; i++) {
    if (argv[i] === '--publisher-email') {
      publisherEmail = (argv[i + 1] ?? '').trim().toLowerCase() || null;
    }
  }

  return { dryRun, publisherEmail, allBrands };
}

function parseStoragePath(fileUrl: string): { bucket: string; path: string } | null {
  try {
    const u = new URL(fileUrl);
    const m = u.pathname.match(/\/storage\/v1\/object\/(?:public|sign)\/([^/]+)\/(.+)/);
    if (!m?.[1] || !m[2]) return null;
    return {
      bucket: m[1],
      path: decodeURIComponent(m[2].split('?')[0] ?? ''),
    };
  } catch {
    return null;
  }
}

async function removeStorageForReleases(
  admin: SupabaseClient,
  releaseIds: string[],
  dryRun: boolean
): Promise<number> {
  if (releaseIds.length === 0) return 0;

  const { data: assets, error } = await admin
    .from('press_assets')
    .select('id, file_url, press_release_id')
    .in('press_release_id', releaseIds);

  if (error) {
    throw new Error(`press_assets read: ${error.message}`);
  }

  const byBucket = new Map<string, Set<string>>();
  for (const row of assets ?? []) {
    const url = typeof row.file_url === 'string' ? row.file_url : '';
    const parsed = parseStoragePath(url);
    if (!parsed) continue;
    if (!byBucket.has(parsed.bucket)) {
      byBucket.set(parsed.bucket, new Set());
    }
    byBucket.get(parsed.bucket)!.add(parsed.path);
  }

  let removed = 0;
  for (const [bucket, paths] of byBucket) {
    const list = [...paths];
    if (list.length === 0) continue;
    if (dryRun) {
      console.log(`  storage [${bucket}]: would remove ${list.length} object(s)`);
      removed += list.length;
      continue;
    }
    const { error: rmErr } = await admin.storage.from(bucket).remove(list);
    if (rmErr) {
      console.warn(`  storage [${bucket}]: ${rmErr.message} (${list.length} paths)`);
    } else {
      console.log(`  storage [${bucket}]: removed ${list.length} object(s)`);
      removed += list.length;
    }
  }

  return removed;
}

async function fetchAllReleasesWithBody(
  admin: SupabaseClient,
  options: { brandId?: string | null } = {}
): Promise<ReleaseRow[]> {
  const rows: ReleaseRow[] = [];
  let offset = 0;

  while (true) {
    let query = admin
      .from('press_releases')
      .select('id, title, body, deleted_at')
      .order('created_at', { ascending: true })
      .range(offset, offset + PAGE_SIZE - 1);

    if (options.brandId) {
      query = query.eq('brand_id', options.brandId);
    }

    const { data, error } = await query;
    if (error) {
      throw new Error(`press_releases read: ${error.message}`);
    }
    if (!data?.length) break;

    for (const row of data) {
      rows.push({
        id: String(row.id),
        title: typeof row.title === 'string' ? row.title : '',
        body: typeof row.body === 'string' ? row.body : '',
        deleted_at: typeof row.deleted_at === 'string' ? row.deleted_at : null,
      });
    }

    if (data.length < PAGE_SIZE) break;
    offset += PAGE_SIZE;
  }

  return rows;
}

function hasBodyText(body: string): boolean {
  return richTextToPlainText(body).trim().length > 0;
}

async function main(): Promise<void> {
  const { dryRun, publisherEmail, allBrands } = parseArgs(process.argv.slice(2));
  const admin = createAdminClient();

  let brandId: string | null = null;
  if (publisherEmail) {
    const brand = await resolvePublisherBrand({
      admin,
      publisherEmail,
      dryRun: false,
    });
    brandId = brand.brandId;
    console.log(`Scope: brand ${brand.displayName} (${brandId})`);
  } else if (allBrands) {
    console.log('Scope: all brands');
  } else {
    console.error(
      'Error: pass --publisher-email <email> to scope to one brand, or pass --all-brands to run across all brands.'
    );
    process.exit(1);
  }

  const rows = await fetchAllReleasesWithBody(admin, { brandId });
  console.log(`Scanned ${rows.length} release(s).`);

  const toDelete = rows.filter((r) => !hasBodyText(r.body));
  if (toDelete.length === 0) {
    console.log('No press releases with empty body found.');
    return;
  }

  const softCount = toDelete.filter((r) => r.deleted_at != null).length;
  console.log(
    `${dryRun ? 'DRY RUN — would hard-delete' : 'Hard-deleting'} ${toDelete.length} release(s)` +
      (softCount > 0 ? ` (${softCount} already soft-deleted)` : '') +
      ' with empty/whitespace-only body.'
  );

  console.log(`\nSample (${Math.min(toDelete.length, SAMPLE_LIMIT)} of ${toDelete.length}):`);
  for (const row of toDelete.slice(0, SAMPLE_LIMIT)) {
    console.log(`  ${row.id}${row.deleted_at ? ' [soft-deleted]' : ''}`);
    console.log(`    ${row.title || '(no title)'}`);
  }
  if (toDelete.length > SAMPLE_LIMIT) {
    console.log(`  ... and ${toDelete.length - SAMPLE_LIMIT} more`);
  }

  const ids = toDelete.map((r) => r.id);

  if (dryRun) {
    await removeStorageForReleases(admin, ids, true);
    console.log('\nDry run complete — no changes written.');
    return;
  }

  assertScriptMutationsAllowed();

  for (let i = 0; i < ids.length; i += DELETE_CHUNK_SIZE) {
    const chunk = ids.slice(i, i + DELETE_CHUNK_SIZE);
    await removeStorageForReleases(admin, chunk, false);

    const { error: deleteErr } = await admin.from('press_releases').delete().in('id', chunk);
    if (deleteErr) {
      throw new Error(`press_releases hard delete: ${deleteErr.message}`);
    }
  }

  console.log(`\nDone. Permanently deleted ${ids.length} press release(s) with empty body.`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
