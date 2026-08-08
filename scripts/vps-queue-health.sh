#!/usr/bin/env bash
# Diagnose + unstick KhayaOS database queue (WhatsApp / signup jobs).
# Usage on VPS: bash /www/wwwroot/khayaos.prohost.cloud/scripts/vps-queue-health.sh
#
# Symptom this fixes: messages sit for hours, then flood in after a restart.
# Cause: khayaos-queue died/stopped (max-time, redis mismatch, crash) while jobs
# stayed in Postgres `jobs` (sometimes reserved until retry_after).
set -euo pipefail

ROOT="/www/wwwroot/khayaos.prohost.cloud"
PHP="/www/server/php/83/bin/php"
BACKEND="${ROOT}/backend"

cd "$BACKEND"

echo "==> Clear config cache so QUEUE_CONNECTION / retry_after are live"
"$PHP" artisan config:clear

echo "==> QUEUE_CONNECTION (must be database on this VPS)"
grep -E '^QUEUE_CONNECTION=' .env || true
"$PHP" artisan tinker --execute="echo 'config=' . config('queue.default') . ' retry_after=' . config('queue.connections.database.retry_after') . PHP_EOL;"

echo "==> PM2 khayaos-queue (before fix)"
pm2 describe khayaos-queue 2>/dev/null | sed -n '1,60p' || true

echo "==> Job counts"
"$PHP" artisan tinker --execute="
\$pending = DB::table('jobs')->whereNull('reserved_at')->count();
\$reserved = DB::table('jobs')->whereNotNull('reserved_at')->count();
\$failed = DB::table('failed_jobs')->count();
echo \"pending=\$pending reserved=\$reserved failed=\$failed\" . PHP_EOL;
\$cutoff = now()->subMinutes(5)->getTimestamp();
\$stuck = DB::table('jobs')->whereNotNull('reserved_at')->where('reserved_at', '<', \$cutoff)->count();
echo \"reserved_over_5m=\$stuck\" . PHP_EOL;
"

echo "==> Recent failed jobs (truncated)"
"$PHP" artisan tinker --execute="
DB::table('failed_jobs')->orderByDesc('failed_at')->limit(5)->get(['failed_at','exception'])
  ->each(function (\$row) {
    echo \$row->failed_at . ' | ' . substr((string) \$row->exception, 0, 200) . PHP_EOL;
  });
"

echo "==> Release stuck reserved jobs older than 2 minutes"
"$PHP" artisan tinker --execute="
\$cutoff = now()->subMinutes(2)->getTimestamp();
\$n = DB::table('jobs')
  ->whereNotNull('reserved_at')
  ->where('reserved_at', '<', \$cutoff)
  ->update(['reserved_at' => null]);
echo \"released=\$n\" . PHP_EOL;
"

echo "==> Recreate worker on database driver (never redis on this host)"
pm2 delete khayaos-queue 2>/dev/null || true
# timeout=60 must stay BELOW config database.retry_after (120).
# max-time=1800: worker recycles every 30m; PM2 must autorestart (default).
pm2 start "$PHP" \
  --name khayaos-queue \
  --cwd "$BACKEND" \
  --max-memory-restart 400M \
  -- \
  artisan queue:work database \
  --sleep=3 \
  --tries=3 \
  --timeout=60 \
  --max-time=1800
pm2 save

echo "==> PM2 khayaos-queue (after fix)"
pm2 describe khayaos-queue 2>/dev/null | sed -n '1,50p' || true

echo "==> Recent Genius / signup WhatsApp log lines"
tail -n 80 storage/logs/laravel.log | grep -E 'WhatsApp|Signup welcome|Signup WhatsApp' || echo "(no recent matches)"

echo "==> Done. Watch live processing with: pm2 logs khayaos-queue --lines 80"
