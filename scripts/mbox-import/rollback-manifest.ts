#!/usr/bin/env node
import path from 'node:path';
import type { SupabaseClient } from '@supabase/supabase-js';
import { createAdminClient } from '@/lib/supabase/admin';
import {
  loadManifest,
  saveManifest,
  type ImportManifest,
} from './manifest';
import { migrationUserEmail } from './parse-sender';

const DEFAULT_MANIFEST = path.join(process.cwd(), 'scripts/mbox-import/.manifest.json');
const PUBLIC_BUCKET = 'press-assets-public';
const PRIVATE_BUCKET = 'press-assets-private';
const MIGRATION_EMAIL_DOMAIN = '@migration.broadbase.local';

function parseArgs(argv: string[]): {
  manifestPath: string;
  dryRun: boolean;
  purgeBrands: boolean;
} {
  let manifestPath = DEFAULT_MANIFEST;
  let dryRun = false;
  let purgeBrands = false;

  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    if (arg === '--dry-run') {
      dryRun = true;
      continue;
    }
    if (arg === '--purge-brands') {
      purgeBrands = true;
      continue;
    }
    if (arg === '--manifest') {
      manifestPath = argv[++i] ?? DEFAULT_MANIFEST;
      continue;
    }
    if (arg === '--help' || arg === '-h') {
      console.log(`Usage: rollback-manifest [options]

Options:
  --manifest <path>   Manifest file (default: scripts/mbox-import/.manifest.json)
  --dry-run           Log actions without writing
  --purge-brands      Also remove migration brands, stub auth users, and storage
  -h, --help          Show this help

By default, soft-deletes press_releases and press_assets listed in manifest.messages,
then clears manifest.messages.

With --purge-brands, also deletes stub users (import+*@migration.broadbase.local),
their brands (DB cascade), subscription rows, and storage under each brand folder.
Then clears manifest.domains.`);
      process.exit(0);
    }
  }

  return { manifestPath, dryRun, purgeBrands };
}

async function softDeleteReleases(
  admin: SupabaseClient | null,
  manifest: ImportManifest,
  dryRun: boolean
): Promise<number> {
  const entries = Object.entries(manifest.messages);
  if (entries.length === 0) return 0;

  const releaseIds = Array.from(new Set(entries.map(([, v]) => v.releaseId)));
  console.log(
    `${dryRun ? 'DRY RUN — would soft-delete' : 'Soft-deleting'} ${releaseIds.length} release(s)...`
  );

  if (dryRun) {
    for (const [, row] of entries) {
      console.log(`  release: ${row.releaseId} — ${row.subject}`);
    }
    return releaseIds.length;
  }

  if (!admin) {
    throw new Error('Admin client required to delete releases');
  }

  const now = new Date().toISOString();
  for (const releaseId of releaseIds) {
    const { error: assetErr } = await admin
      .from('press_assets')
      .update({ deleted_at: now })
      .eq('press_release_id', releaseId)
      .is('deleted_at', null);
    if (assetErr) {
      throw new Error(`press_assets delete failed for ${releaseId}: ${assetErr.message}`);
    }

    const { error: releaseErr } = await admin
      .from('press_releases')
      .update({ deleted_at: now })
      .eq('id', releaseId)
      .is('deleted_at', null);
    if (releaseErr) {
      throw new Error(`press_releases delete failed for ${releaseId}: ${releaseErr.message}`);
    }

    console.log(`  deleted release: ${releaseId}`);
  }

  manifest.messages = {};
  return releaseIds.length;
}

async function listAllStoragePaths(
  admin: SupabaseClient,
  bucket: string,
  prefix: string
): Promise<string[]> {
  const paths: string[] = [];
  let offset = 0;

  while (true) {
    const { data, error } = await admin.storage.from(bucket).list(prefix, {
      limit: 100,
      offset,
      sortBy: { column: 'name', order: 'asc' },
    });
    if (error) {
      throw new Error(`storage list failed (${bucket}/${prefix}): ${error.message}`);
    }
    if (!data?.length) break;

    for (const item of data) {
      if (!item.name || item.name.endsWith('/')) continue;
      paths.push(`${prefix}/${item.name}`);
    }

    offset += data.length;
    if (data.length < 100) break;
  }

  return paths;
}

async function removeBrandStorage(
  admin: SupabaseClient,
  brandId: string,
  dryRun: boolean
): Promise<number> {
  let removed = 0;

  for (const bucket of [PUBLIC_BUCKET, PRIVATE_BUCKET]) {
    const paths = await listAllStoragePaths(admin, bucket, brandId);
    if (paths.length === 0) continue;

    if (dryRun) {
      console.log(`  storage [${bucket}]: would remove ${paths.length} object(s)`);
      removed += paths.length;
      continue;
    }

    const { error } = await admin.storage.from(bucket).remove(paths);
    if (error) {
      throw new Error(`storage remove failed (${bucket}): ${error.message}`);
    }
    console.log(`  storage [${bucket}]: removed ${paths.length} object(s)`);
    removed += paths.length;
  }

  return removed;
}

async function assertMigrationStubUser(
  admin: SupabaseClient,
  ownerId: string,
  domain: string
): Promise<void> {
  const { data, error } = await admin.auth.admin.getUserById(ownerId);
  if (error || !data.user) {
    throw new Error(`Could not load user ${ownerId} for ${domain}: ${error?.message ?? 'not found'}`);
  }

  const email = data.user.email?.toLowerCase() ?? '';
  const expected = migrationUserEmail(domain).toLowerCase();

  if (email !== expected) {
    throw new Error(
      `Refusing to delete ${ownerId}: email "${email}" does not match migration stub "${expected}"`
    );
  }
  if (!email.endsWith(MIGRATION_EMAIL_DOMAIN)) {
    throw new Error(`Refusing to delete ${ownerId}: not a @migration.broadbase.local stub`);
  }
}

async function purgeMigrationBrands(
  admin: SupabaseClient,
  manifest: ImportManifest,
  dryRun: boolean
): Promise<{ brands: number; storageObjects: number; users: number }> {
  const domains = Object.entries(manifest.domains);
  if (domains.length === 0) return { brands: 0, storageObjects: 0, users: 0 };

  console.log(
    `${dryRun ? 'DRY RUN — would purge' : 'Purging'} ${domains.length} migration brand(s)...`
  );

  let storageObjects = 0;
  let users = 0;

  for (const [domain, entry] of domains) {
    console.log(`\n  domain: ${domain} (${entry.displayName})`);
    console.log(`    brand: ${entry.brandId}`);
    console.log(`    owner: ${entry.ownerId}`);

    await assertMigrationStubUser(admin, entry.ownerId, domain);

    storageObjects += await removeBrandStorage(admin, entry.brandId, dryRun);

    if (dryRun) {
      console.log(`    would delete auth user: ${migrationUserEmail(domain)}`);
      users++;
      continue;
    }

    const { error } = await admin.auth.admin.deleteUser(entry.ownerId);
    if (error) {
      throw new Error(`deleteUser failed for ${entry.ownerId}: ${error.message}`);
    }
    console.log(`    deleted auth user: ${migrationUserEmail(domain)}`);
    users++;
  }

  if (!dryRun) {
    manifest.domains = {};
  }

  return { brands: domains.length, storageObjects, users };
}

async function main(): Promise<void> {
  const { manifestPath, dryRun, purgeBrands } = parseArgs(process.argv.slice(2));
  const manifest = loadManifest(manifestPath);

  const hasMessages = Object.keys(manifest.messages).length > 0;
  const hasDomains = Object.keys(manifest.domains).length > 0;

  if (!hasMessages && !hasDomains) {
    console.log('Manifest is empty — nothing to roll back.');
    return;
  }

  if (!hasMessages && hasDomains && !purgeBrands) {
    console.log(
      'Manifest has migration brands but no messages. Re-run with --purge-brands to remove them.'
    );
    return;
  }

  const needsAdmin = !dryRun || purgeBrands;
  const admin = needsAdmin ? createAdminClient() : null;

  let releaseCount = 0;
  if (hasMessages) {
    releaseCount = await softDeleteReleases(admin, manifest, dryRun);
    if (!dryRun) {
      saveManifest(manifestPath, manifest);
      console.log(`\nCleared manifest.messages (${releaseCount} release(s)).`);
    }
  }

  if (purgeBrands && hasDomains) {
    if (!admin) {
      throw new Error('Admin client unavailable');
    }
    const result = await purgeMigrationBrands(admin, manifest, dryRun);
    if (!dryRun) {
      saveManifest(manifestPath, manifest);
      console.log(`\nCleared manifest.domains.`);
    }
    console.log(
      `\nPurge summary: ${result.brands} brand(s), ${result.users} user(s), ${result.storageObjects} storage object(s).`
    );
  }

  if (dryRun) {
    console.log('\nDry run complete — no changes written.');
  } else {
    console.log('Done.');
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
