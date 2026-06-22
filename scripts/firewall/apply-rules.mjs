#!/usr/bin/env node
/**
 * Apply Vercel WAF rules from scripts/firewall/manifest.json.
 */
import { readFileSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));

function parseArgs(argv) {
  const opts = { manifest: join(__dirname, 'manifest.json'), dryRun: false, yes: false };
  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    if (arg === '--manifest') opts.manifest = argv[++i];
    else if (arg === '--dry-run') opts.dryRun = true;
    else if (arg === '--yes') opts.yes = true;
    else if (arg === '--help' || arg === '-h') {
      console.log(`usage: apply-rules.mjs [--manifest path] [--dry-run] [--yes]`);
      process.exit(0);
    }
  }
  return opts;
}

function runVercel(args, { inherit = false } = {}) {
  const result = spawnSync('vercel', args, {
    encoding: 'utf8',
    stdio: inherit ? 'inherit' : 'pipe',
  });
  if (result.error) {
    console.error(`error: failed to run vercel ${args.join(' ')}: ${result.error.message}`);
    process.exit(1);
  }
  if (result.status !== 0) {
    const err = (result.stderr || result.stdout || '').trim();
    console.error(err || `vercel ${args[0]} exited ${result.status}`);
    process.exit(result.status ?? 1);
  }
  return (result.stdout || '').trim();
}

function buildCliArgs(rule) {
  const { action, conditions, rateLimit, description } = rule.cli;
  const args = [];

  if (description) {
    args.push('--description', description);
  }

  for (const condition of conditions ?? []) {
    if (condition.or) args.push('--or');
    const { or: _or, ...payload } = condition;
    args.push('--condition', JSON.stringify(payload));
  }

  args.push('--action', action);

  if (action === 'rate_limit') {
    if (!rateLimit?.window || !rateLimit?.requests) {
      throw new Error(`rate_limit rule missing window/requests: ${rule.name}`);
    }
    args.push('--rate-limit-window', String(rateLimit.window));
    args.push('--rate-limit-requests', String(rateLimit.requests));
    for (const key of rateLimit.keys ?? ['ip']) {
      args.push('--rate-limit-keys', key);
    }
    if (rateLimit.algo) {
      args.push('--rate-limit-algo', rateLimit.algo);
    }
    args.push('--rate-limit-action', rateLimit.exceededAction ?? 'rate_limit');
  }

  args.push('--yes');
  return args;
}

function loadExistingRuleNames() {
  const raw = runVercel(['firewall', 'rules', 'list', '--json']);
  if (!raw) return new Set();
  try {
    const rules = JSON.parse(raw);
    return new Set(rules.map((r) => r?.name).filter(Boolean));
  } catch {
    return new Set();
  }
}

const opts = parseArgs(process.argv.slice(2));
const manifest = JSON.parse(readFileSync(opts.manifest, 'utf8'));
const existing = loadExistingRuleNames();

let added = 0;
let skipped = 0;

console.log(`Applying ${manifest.rules.length} WAF rule(s) from ${opts.manifest}...`);

for (const rule of manifest.rules) {
  if (existing.has(rule.name)) {
    console.log(`  skip: ${rule.name} (already exists)`);
    skipped++;
    continue;
  }

  const cliArgs = buildCliArgs(rule);

  if (opts.dryRun) {
    console.log(`  dry-run: would add ${rule.name}`);
    console.log(`    vercel firewall rules add ${JSON.stringify(rule.name)} ${cliArgs.map((a) => JSON.stringify(a)).join(' ')}`);
    added++;
    continue;
  }

  console.log(`  add: ${rule.name}`);
  runVercel(['firewall', 'rules', 'add', rule.name, ...cliArgs], { inherit: true });
  added++;
}

if (opts.dryRun) {
  console.log(`Dry run complete (${added} would be added, ${skipped} already present).`);
  process.exit(0);
}

if (added === 0) {
  console.log(`No new rules to publish (${skipped} already present).`);
  process.exit(0);
}

console.log('\nStaged changes:');
runVercel(['firewall', 'diff'], { inherit: true });

if (opts.yes) {
  runVercel(['firewall', 'publish', '--yes'], { inherit: true });
  console.log('Published.');
  process.exit(0);
}

console.log('\nPublish with: vercel firewall publish --yes');
console.log('Or re-run: npm run firewall:apply -- --yes');
