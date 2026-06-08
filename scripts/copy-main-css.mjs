#!/usr/bin/env node
/**
 * Next.js 14.2.x may emit <link href="/_next/static/css/app/layout.css"> but that path
 * 404s while the real bundle lives at `/_next/static/css/<hash>.css`. Copy the largest
 * root-level CSS file to public so /bb-globals.css always resolves after build.
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, '..');
const cssDir = path.join(root, '.next', 'static', 'css');

function main() {
  if (!fs.existsSync(cssDir)) {
    console.warn('[copy-main-css] .next/static/css missing — skip (run next build first)');
    process.exit(0);
  }

  const entries = fs.readdirSync(cssDir, { withFileTypes: true });
  let bestPath = null;
  let bestSize = 0;

  for (const ent of entries) {
    if (!ent.isFile() || !ent.name.endsWith('.css')) continue;
    const full = path.join(cssDir, ent.name);
    const size = fs.statSync(full).size;
    if (size > bestSize) {
      bestSize = size;
      bestPath = full;
    }
  }

  if (!bestPath) {
    console.warn('[copy-main-css] no CSS files found — skip');
    process.exit(0);
  }

  const outDir = path.join(root, 'public');
  fs.mkdirSync(outDir, { recursive: true });
  const dest = path.join(outDir, 'bb-globals.css');
  fs.copyFileSync(bestPath, dest);
  console.log(`[copy-main-css] ${path.basename(bestPath)} (${bestSize} bytes) → public/bb-globals.css`);
}

main();
