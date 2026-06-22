#!/usr/bin/env bash
# Apply Broadbase Vercel WAF rules from manifest.json.
#
# Prerequisites:
#   - Vercel CLI (npm i -g vercel)
#   - Logged in: vercel login
#   - Project linked: vercel link (from repo root)
#   - Team/project with WAF enabled (Pro or higher for full rule set)
#
# Usage:
#   npm run firewall:apply
#   npm run firewall:apply:hobby
#   npm run firewall:apply -- --dry-run
#   npm run firewall:apply -- --yes
#   npm run firewall:overview

set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
MANIFEST="${ROOT}/scripts/firewall/manifest.json"

if [[ "${1:-}" == "--overview" ]]; then
  cd "${ROOT}"
  vercel firewall overview
  exit 0
fi

exec node "${ROOT}/scripts/firewall/apply-rules.mjs" --manifest "${MANIFEST}" "$@"
