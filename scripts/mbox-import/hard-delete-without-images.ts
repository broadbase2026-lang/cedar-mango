#!/usr/bin/env node
import type { SupabaseClient } from '@supabase/supabase-js';
import { createAdminClient } from '@/lib/supabase/admin';
import { assertScriptMutationsAllowed } from '@/scripts/lib/script-env-guard';
import { fetchAllPressReleases } from './fetch-brand-releases';
import { resolvePublisherBrand } from './resolve-publisher';

const DELETE_CHUNK_SIZE = 200;
const SAMPLE_LIMIT = 15;
const PAGE_SIZE = 1000;

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

async function fetchReleaseIdsWithImages(
  admin: SupabaseClient,
  brandId: string | null
): Promise<Set<string>> {
  const ids = new Set<string>();
  let offset = 0;

  while (true) {
    let query = admin
      .from('press_assets')
      .select('press_release_id')
      .eq('file_type', 'image')
      .is('deleted_at', null)
      .not('press_release_id', 'is', null);

    if (brandId) {
      query = query.eq('brand_id', brandId);
    }

    const { data, error } = await query.range(offset, offset + PAGE_SIZE - 1);
    if (error) {
      throw new Error(`press_assets read: ${error.message}`);
    }
    if (!data?.length) break;

    for (const row of data) {
      if (row.press_release_id) ids.add(String(row.press_release_id));
    }

    if (data.length < PAGE_SIZE) break;
    offset += PAGE_SIZE;
  }

  return ids;
}

async function removeStorageForReleases(
  admin: SupabaseClient,
  releaseIds: string[],
  dryRun: boolean
): Promise<number> {
  if (releaseIds.length === 0) return 0;

  const byBucket = new Map<string, Set<string>>();

  for (let i = 0; i < releaseIds.length; i += DELETE_CHUNK_SIZE) {
    const chunk = releaseIds.slice(i, i + DELETE_CHUNK_SIZE);
    const { data: assets, error } = await admin
      .from('press_assets')
      .select('id, file_url, press_release_id')
      .in('press_release_id', chunk);

    if (error) {
      throw new Error(`press_assets read: ${error.message}`);
    }

    for (const row of assets ?? []) {
      const url = typeof row.file_url === 'string' ? row.file_url : '';
      const parsed = parseStoragePath(url);
      if (!parsed) continue;
      if (!byBucket.has(parsed.bucket)) {
        byBucket.set(parsed.bucket, new Set());
      }
      byBucket.get(parsed.bucket)!.add(parsed.path);
    }
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

  if (!publisherEmail) {
    console.error(
      'Error: --publisher-email is required. Refusing to run against all brands.'
    );
    process.exit(1);
  }

  const admin = createAdminClient();

  let brandId: string | null = null;
  const brand = await resolvePublisherBrand({
    admin,
    publisherEmail,
    dryRun: false,
  });
  brandId = brand.brandId;
  console.log(`Scope: brand ${brand.displayName} (${brandId})`);

  const [allReleases, withImages] = await Promise.all([
    fetchAllPressReleases(admin, { brandId }),
    fetchReleaseIdsWithImages(admin, brandId),
  ]);

  const activeReleases = allReleases.filter((row) => row.deleted_at == null);
  const toDelete = activeReleases.filter((row) => !withImages.has(row.id));

  console.log(`Scanned ${activeReleases.length} active release(s).`);
  console.log(`${withImages.size} release(s) have attached images.`);
  console.log(
    `${toDelete.length} release(s) have no attached images and would be hard-deleted.`
  );

  if (toDelete.length === 0) {
    console.log('Nothing to delete.');
    return;
  }

  console.log(`\nSample titles (${Math.min(toDelete.length, SAMPLE_LIMIT)} of ${toDelete.length}):`);
  for (const row of toDelete.slice(0, SAMPLE_LIMIT)) {
    console.log(`  ${row.id}`);
    console.log(`    ${row.title}`);
  }
  if (toDelete.length > SAMPLE_LIMIT) {
    console.log(`  ... and ${toDelete.length - SAMPLE_LIMIT} more`);
  }

  const ids = toDelete.map((row) => row.id);

  if (dryRun) {
    await removeStorageForReleases(admin, ids, true);
    console.log('\nDry run complete — no changes written.');
    return;
  }

  assertScriptMutationsAllowed();

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

  console.log(`\nDone. Permanently deleted ${ids.length} release(s) without images.`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
