#!/usr/bin/env node
import type { SupabaseClient } from '@supabase/supabase-js';
import { createAdminClient } from '@/lib/supabase/admin';
import { assertScriptMutationsAllowed } from '@/scripts/lib/script-env-guard';
import { fetchAllPressReleases } from './fetch-brand-releases';
import { matchDeleteTitle } from './delete-title-patterns';
import { resolvePublisherBrand } from './resolve-publisher';

const PUBLIC_BUCKET = 'press-assets-public';
const PRIVATE_BUCKET = 'press-assets-private';
const DELETE_CHUNK_SIZE = 200;

function parseArgs(argv: string[]): {
  dryRun: boolean;
  publisherEmail: string | null;
} {
  let dryRun = false;
  let publisherEmail: string | null = null;

  for (const arg of argv) {
    if (arg === '--dry-run') dryRun = true;
    if (arg.startsWith('--publisher-email=')) {
      publisherEmail = arg.slice('--publisher-email='.length).trim().toLowerCase() || null;
    }
  }
  for (let i = 0; i < argv.length; i++) {
    if (argv[i] === '--publisher-email') {
      publisherEmail = (argv[i + 1] ?? '').trim().toLowerCase() || null;
    }
  }

  return { dryRun, publisherEmail };
}

function parseStoragePath(
  fileUrl: string
): { bucket: string; path: string } | null {
  try {
    const u = new URL(fileUrl);
    const m = u.pathname.match(
      /\/storage\/v1\/object\/(?:public|sign)\/([^/]+)\/(.+)/
    );
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

async function main(): Promise<void> {
  const { dryRun, publisherEmail } = parseArgs(process.argv.slice(2));
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
  } else {
    console.log('Scope: all brands');
  }

  const rows = await fetchAllPressReleases(admin, { brandId });
  console.log(`Scanned ${rows.length} release(s).`);

  const matches = rows
    .map((row) => {
      const title = typeof row.title === 'string' ? row.title : '';
      const reason = matchDeleteTitle(title);
      if (!reason) return null;
      return {
        id: String(row.id),
        title,
        reason,
        softDeleted: row.deleted_at != null,
      };
    })
    .filter((r): r is NonNullable<typeof r> => r !== null);

  if (matches.length === 0) {
    console.log('No matching press releases found.');
    return;
  }

  const softCount = matches.filter((m) => m.softDeleted).length;
  console.log(
    `${dryRun ? 'DRY RUN — would hard-delete' : 'Hard-deleting'} ${matches.length} release(s)` +
      (softCount > 0 ? ` (${softCount} already soft-deleted)` : '') +
      ':\n'
  );
  for (const m of matches) {
    console.log(
      `  [${m.reason}]${m.softDeleted ? ' [soft-deleted]' : ''} ${m.id}`
    );
    console.log(`    ${m.title}`);
  }

  if (dryRun) {
    const ids = matches.map((m) => m.id);
    await removeStorageForReleases(admin, ids, true);
    console.log('\nDry run complete — no changes written.');
    return;
  }

  assertScriptMutationsAllowed();

  const ids = matches.map((m) => m.id);
  for (let i = 0; i < ids.length; i += DELETE_CHUNK_SIZE) {
    const chunk = ids.slice(i, i + DELETE_CHUNK_SIZE);
    await removeStorageForReleases(admin, chunk, false);

    const { error: deleteErr } = await admin
      .from('press_releases')
      .delete()
      .in('id', chunk);

    if (deleteErr) {
      throw new Error(`press_releases hard delete: ${deleteErr.message}`);
    }
  }

  console.log(`\nDone. Permanently deleted ${ids.length} release(s).`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
