#!/usr/bin/env bash
# Fail if HTML from Next references /_next/static chunks that are missing on disk.
# Usage:
#   bash scripts/verify-frontend-chunks.sh [url]
# Default URL: http://127.0.0.1:3004/admin/dashboard
#
set -euo pipefail

ROOT="/www/wwwroot/khayaos.prohost.cloud"
FRONTEND="${ROOT}/frontend"
URL="${1:-http://127.0.0.1:3004/admin/dashboard}"

if [[ ! -d "${FRONTEND}/.next" ]]; then
  echo "FAIL: ${FRONTEND}/.next is missing — run a full frontend build"
  exit 1
fi

HTML="$(curl -fsS "$URL")"

# Pull only clean asset paths (no escapes / trailing junk).
mapfile -t PATHS < <(
  printf '%s' "$HTML" \
    | grep -oE '/_next/static/[A-Za-z0-9._/-]+\.(js|css|woff2?)' \
    | sed 's/[\\"]*$//' \
    | sort -u
)

if [[ ${#PATHS[@]} -eq 0 ]]; then
  echo "WARN: no /_next/static asset references found in ${URL}"
  echo "HTML length: ${#HTML}"
  exit 0
fi

MISSING=0
FOUND=0
for p in "${PATHS[@]}"; do
  rel="${p%%\?*}"
  # Next serves built assets from .next/static (not frontend/public/_next)
  file="${FRONTEND}/.next/static/${rel#/_next/static/}"
  if [[ -f "$file" ]]; then
    FOUND=$((FOUND + 1))
  else
    echo "MISSING: ${rel}"
    MISSING=$((MISSING + 1))
  fi
done

echo "Checked ${#PATHS[@]} unique assets from ${URL} (found=${FOUND}, missing=${MISSING})"

if [[ "$MISSING" -gt 0 ]]; then
  echo "FAIL: ${MISSING} referenced asset(s) missing under ${FRONTEND}/.next/static"
  echo "Rebuild with: pm2 stop khayaos-frontend && cd ${FRONTEND} && rm -rf .next && npm run build && pm2 start khayaos-frontend"
  exit 1
fi

echo "OK: all referenced /_next/static assets exist on disk"
