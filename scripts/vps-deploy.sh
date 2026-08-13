#!/usr/bin/env bash
# KhayaOS production deploy — permanent safe order for this VPS.
# Prevents stale Next.js HTML ↔ deleted /_next/static chunk mismatches.
#
# Usage (on VPS as root):
#   bash /www/wwwroot/khayaos.prohost.cloud/scripts/vps-deploy.sh
#
set -euo pipefail

ROOT="/www/wwwroot/khayaos.prohost.cloud"
SAFE="safe.directory=${ROOT}"
PHP="/www/server/php/83/bin/php"
COMPOSER_BIN="${COMPOSER_BIN:-$(command -v composer || true)}"

cd "$ROOT"

echo "==> git pull"
git -c "$SAFE" pull origin main
git -c "$SAFE" log -1 --oneline

echo "==> backend"
cd "$ROOT/backend"
if [[ -n "$COMPOSER_BIN" ]]; then
  # Always use PHP 8.3 — bare `composer` on this host may invoke system PHP 8.1.
  "$PHP" "$COMPOSER_BIN" install --no-dev --optimize-autoloader --no-interaction || true
fi
"$PHP" artisan migrate --force
"$PHP" artisan db:seed --class=PricingSeeder --force
"$PHP" artisan ops-pwa:schedule-existing-nudges
"$PHP" artisan config:clear

echo "==> frontend (STOP before replacing .next — required)"
pm2 stop khayaos-frontend
cd "$ROOT/frontend"
npm install
rm -rf .next
npm run build

echo "==> restart processes"
pm2 start khayaos-frontend
# Recreate queue worker on database (never leave a dead/redis worker after deploy).
bash "$ROOT/scripts/vps-queue-health.sh"
pm2 restart khayaos-reverb

echo "==> verify build"
curl -fsS "http://127.0.0.1:3004/app-version.json"
echo
curl -fsS "https://khayaos.prohost.cloud/app-version.json" || true
echo

echo "==> verify admin shell chunks exist on disk"
bash "$ROOT/scripts/verify-frontend-chunks.sh" "http://127.0.0.1:3004/admin/dashboard"

echo "==> deploy OK"
git -c "$SAFE" log -1 --oneline
