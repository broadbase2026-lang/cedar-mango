#!/usr/bin/env node
import { createAdminClient } from '@/lib/supabase/admin';
import { assertScriptMutationsAllowed } from '@/scripts/lib/script-env-guard';
import { fetchAllPressReleases } from './fetch-brand-releases';
import { matchDeleteTitle } from './delete-title-patterns';
import { resolvePublisherBrand } from './resolve-publisher';

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

  const rows = (await fetchAllPressReleases(admin, { brandId })).filter(
    (row) => row.deleted_at == null
  );

  const matches = rows
    .map((row) => {
      const title = typeof row.title === 'string' ? row.title : '';
      const reason = matchDeleteTitle(title);
      if (!reason) return null;
      return {
        id: String(row.id),
        title,
        reason,
      };
    })
    .filter((r): r is NonNullable<typeof r> => r !== null);

  if (matches.length === 0) {
    console.log('No matching press releases found.');
    return;
  }

  console.log(
    `${dryRun ? 'DRY RUN — would delete' : 'Deleting'} ${matches.length} release(s):\n`
  );
  for (const m of matches) {
    console.log(`  [${m.reason}] ${m.id}`);
    console.log(`    ${m.title}`);
  }

  if (dryRun) {
    console.log('\nDry run complete — no changes written.');
    return;
  }

  assertScriptMutationsAllowed();

  const now = new Date().toISOString();
  let deleted = 0;

  for (const m of matches) {
    const { error: assetErr } = await admin
      .from('press_assets')
      .update({ deleted_at: now })
      .eq('press_release_id', m.id)
      .is('deleted_at', null);

    if (assetErr) {
      throw new Error(`press_assets: ${assetErr.message}`);
    }

    const { error: releaseErr } = await admin
      .from('press_releases')
      .update({ deleted_at: now })
      .eq('id', m.id)
      .is('deleted_at', null);

    if (releaseErr) {
      throw new Error(`press_releases: ${releaseErr.message}`);
    }

    deleted++;
  }

  console.log(`\nDone. Soft-deleted ${deleted} release(s) and their assets.`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
