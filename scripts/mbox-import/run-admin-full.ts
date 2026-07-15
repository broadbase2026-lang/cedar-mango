#!/usr/bin/env node
/**
 * Full mbox import into the Broadbase brand workspace owned by admin@broadbase.app.
 *
 * Usage:
 *   npm run import-mbox:admin
 *   npm run import-mbox:admin -- --dry-run --limit 5
 *
 * Override mbox path:
 *   MBOX_PATH=/path/to/archive.mbox npm run import-mbox:admin
 *
 * Production (.env.local points at prod Supabase):
 *   BROADBASE_SCRIPT_OVERRIDE_PROD=januptxbjjjuvmuumekv npm run import-mbox:admin
 *   (ref must match BROADBASE_PROD_SUPABASE_PROJECT_REF exactly; unset after the run)
 */
const DEFAULT_MBOX_PATH = '/Users/gavin/Desktop/allmail.mbox';
const ADMIN_PUBLISHER_EMAIL = 'admin@broadbase.app';

const mboxPath = process.env.MBOX_PATH?.trim() || DEFAULT_MBOX_PATH;
const userArgs = process.argv.slice(2);

process.argv = [
  process.argv[0]!,
  process.argv[1]!,
  '--mbox',
  mboxPath,
  '--publisher-email',
  ADMIN_PUBLISHER_EMAIL,
  ...userArgs,
];

void import('./run');
