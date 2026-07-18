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

HTML="$(curl -fsS "$URL")"
# Extract chunk / CSS / font paths under /_next/static/
mapfile -t PATHS < <(printf '%s' "$HTML" | grep -oE '/_next/static/[^"'\'' ]+' | sort -u || true)

if [[ ${#PATHS[@]} -eq 0 ]]; then
  echo "WARN: no /_next/static references found in ${URL}"
  exit 0
fi

MISSING=0
for p in "${PATHS[@]}"; do
  # Strip query string if any
  rel="${p%%\?*}"
  file="${FRONTEND}${rel}"
  if [[ ! -f "$file" ]]; then
    echo "MISSING: ${rel}"
    MISSING=$((MISSING + 1))
  fi
done

if [[ "$MISSING" -gt 0 ]]; then
  echo "FAIL: ${MISSING} referenced asset(s) missing under ${FRONTEND}"
  echo "This is the stale HTML ↔ chunks mismatch. Rebuild with frontend STOPPED."
  exit 1
fi

echo "OK: all ${#PATHS[@]} referenced /_next/static assets exist for ${URL}"
