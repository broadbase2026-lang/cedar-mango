#!/usr/bin/env node
import path from 'node:path';
import type { GenerativeModel } from '@google/generative-ai';
import { createReleaseImportModel } from '@/lib/migration/release-import-core';
import { createAdminClient } from '@/lib/supabase/admin';
import { buildReleaseFromMessage } from './build-release';
import {
  extractMessage,
  fallbackMessageId,
  shouldSkipMessage,
} from './extract-message';
import { insertDraftRelease } from './insert-release';
import {
  hasProcessedMessage,
  loadManifest,
  saveManifest,
  type ImportManifest,
} from './manifest';
import { streamMboxMessages } from './parse-mbox';
import { resolveBrandForSender } from './resolve-brand';
import { uploadMessageAttachments } from './upload-attachments';

const DEFAULT_MANIFEST = path.join(process.cwd(), 'scripts/mbox-import/.manifest.json');

const GEMINI_SLEEP_MS = 1000;

type CliOptions = {
  mboxPath: string;
  dryRun: boolean;
  limit: number | null;
  skipAttachments: boolean;
  manifestPath: string;
};

function parseArgs(argv: string[]): CliOptions {
  let mboxPath = '';
  let dryRun = false;
  let limit: number | null = null;
  let skipAttachments = false;
  let manifestPath = DEFAULT_MANIFEST;

  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    if (arg === '--dry-run') {
      dryRun = true;
      continue;
    }
    if (arg === '--skip-attachments') {
      skipAttachments = true;
      continue;
    }
    if (arg === '--mbox') {
      mboxPath = argv[++i] ?? '';
      continue;
    }
    if (arg === '--limit') {
      const n = Number(argv[++i]);
      limit = Number.isFinite(n) && n > 0 ? n : null;
      continue;
    }
    if (arg === '--manifest') {
      manifestPath = argv[++i] ?? DEFAULT_MANIFEST;
      continue;
    }
    if (arg === '--help' || arg === '-h') {
      printHelp();
      process.exit(0);
    }
  }

  if (!mboxPath) {
    console.error('Error: --mbox <path> is required.\n');
    printHelp();
    process.exit(1);
  }

  return { mboxPath, dryRun, limit, skipAttachments, manifestPath };
}

const EXAMPLE_MBOX = '/Users/gavin/Desktop/allmail.mbox';

function printHelp(): void {
  console.log(`Mbox bulk migration — import press releases into Broadbase as drafts.

Run from the project root (loads .env.local):

  # 1. Dry run — first 5 messages, no DB writes
  node --env-file=.env.local ./node_modules/.bin/tsx scripts/mbox-import/run.ts \\
    --mbox ${EXAMPLE_MBOX} --dry-run --limit 5

  # 2. Pilot — first 20 messages
  node --env-file=.env.local ./node_modules/.bin/tsx scripts/mbox-import/run.ts \\
    --mbox ${EXAMPLE_MBOX} --limit 20

  # 3. Full import
  node --env-file=.env.local ./node_modules/.bin/tsx scripts/mbox-import/run.ts \\
    --mbox ${EXAMPLE_MBOX}

Shorthand (same flags after --):

  npm run import-mbox -- --mbox ${EXAMPLE_MBOX} --dry-run --limit 5

Options:
  --mbox <path>         Path to the mbox file (required)
  --dry-run             Parse and log without writing to the database
  --limit <n>           Process only the first N messages (stops reading early)
  --skip-attachments    Import body only; skip storage uploads
  --manifest <path>     Idempotency manifest (default: scripts/mbox-import/.manifest.json)
  -h, --help            Show this help

Environment (.env.local):
  NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, GEMINI_API_KEY (plain-text/PDF only)
`);
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function main(): Promise<void> {
  const opts = parseArgs(process.argv.slice(2));
  const mboxAbs = path.resolve(opts.mboxPath);

  console.log(`Mbox import: ${mboxAbs}`);
  console.log(
    `Mode: ${opts.dryRun ? 'DRY RUN' : 'LIVE'} | manifest: ${opts.manifestPath}`
  );

  if (opts.limit != null) {
    console.log(`Streaming up to ${opts.limit} message(s) from mbox...`);
  } else {
    console.log('Streaming messages from mbox (file is read incrementally)...');
  }

  const manifest: ImportManifest = loadManifest(opts.manifestPath);
  const admin = opts.dryRun ? null : createAdminClient();

  let model: GenerativeModel | null = null;
  try {
    model = createReleaseImportModel();
  } catch {
    console.warn('GEMINI_API_KEY not set — only HTML emails can be imported.');
  }

  const stats = {
    imported: 0,
    skipped: 0,
    duplicates: 0,
    errors: 0,
    brandsCreated: 0,
  };

  let messageIndex = 0;

  for await (const rawMessage of streamMboxMessages(mboxAbs, {
    maxMessages: opts.limit ?? undefined,
  })) {
    messageIndex++;
    const progressLabel =
      opts.limit != null
        ? `[${messageIndex}/${opts.limit}]`
        : `[${messageIndex}]`;
    console.log(`\n${progressLabel}`);

    try {
      const msg = await extractMessage(rawMessage);
      const skipReason = shouldSkipMessage(msg);
      if (skipReason) {
        console.log(`  skip: ${skipReason} — "${msg.subject}"`);
        stats.skipped++;
        continue;
      }

      const messageId = msg.messageId?.trim() || fallbackMessageId(msg);
      if (hasProcessedMessage(manifest, messageId)) {
        console.log(`  duplicate: ${messageId} — "${msg.subject}"`);
        stats.duplicates++;
        continue;
      }

      const brand = await resolveBrandForSender({
        admin,
        fromRaw: msg.from,
        manifest,
        dryRun: opts.dryRun,
      });

      if (!brand) {
        console.log(`  skip: could not parse sender — "${msg.subject}"`);
        stats.skipped++;
        continue;
      }

      if (brand.created) {
        stats.brandsCreated++;
        console.log(
          `  brand: ${brand.created ? 'CREATE' : 'reuse'} ${brand.displayName} (${brand.domain})`
        );
      } else {
        console.log(`  brand: reuse ${brand.displayName} (${brand.domain})`);
      }

      const release = await buildReleaseFromMessage(msg, model);
      if (!release) {
        console.log(`  skip: no usable body — "${msg.subject}"`);
        stats.skipped++;
        continue;
      }

      console.log(
        `  extract: ${release.strategy}${release.usedGemini ? ' (gemini)' : ''} — "${release.title}"`
      );

      if (opts.dryRun) {
        console.log(`  dry-run: would insert draft for brand ${brand.brandId}`);
        if (!opts.skipAttachments && msg.attachments.length > 0) {
          console.log(
            `  dry-run: would upload ${msg.attachments.length} attachment(s)`
          );
        }
        stats.imported++;
        continue;
      }

      if (!admin) {
        throw new Error('Admin client unavailable');
      }

      const releaseId = await insertDraftRelease(admin, brand.brandId, release);
      console.log(`  inserted: release ${releaseId}`);

      manifest.messages[messageId] = {
        releaseId,
        brandId: brand.brandId,
        subject: msg.subject,
      };
      saveManifest(opts.manifestPath, manifest);

      if (!opts.skipAttachments && msg.attachments.length > 0) {
        const { uploaded, skipped } = await uploadMessageAttachments({
          admin,
          brandId: brand.brandId,
          releaseId,
          attachments: msg.attachments,
        });
        console.log(`  attachments: ${uploaded} uploaded, ${skipped} skipped`);
      }

      stats.imported++;

      if (release.usedGemini) {
        await sleep(GEMINI_SLEEP_MS);
      }
    } catch (err) {
      stats.errors++;
      console.error(
        `  error: ${err instanceof Error ? err.message : String(err)}`
      );
    }
  }

  console.log('\n--- Summary ---');
  console.log(`Imported:   ${stats.imported}`);
  console.log(`Skipped:    ${stats.skipped}`);
  console.log(`Duplicates: ${stats.duplicates}`);
  console.log(`Brands new: ${stats.brandsCreated}`);
  console.log(`Errors:     ${stats.errors}`);

  if (stats.errors > 0) {
    process.exit(1);
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
