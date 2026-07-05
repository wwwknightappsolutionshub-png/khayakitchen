# KhayaOS VPS Deploy (Production)

**Server path:** `/www/wwwroot/khayaos.prohost.cloud`

---

## CRITICAL — Git safe.directory (required on VPS)

This repo is owned by a different user than `root`. **Never** run bare `git pull` or `git log` on the VPS — they fail with `fatal: detected dubious ownership`.

**Always prefix every git command** with:

```bash
-c safe.directory=/www/wwwroot/khayaos.prohost.cloud
```

Examples:

```bash
git -c safe.directory=/www/wwwroot/khayaos.prohost.cloud pull origin main
git -c safe.directory=/www/wwwroot/khayaos.prohost.cloud log -1 --oneline
git -c safe.directory=/www/wwwroot/khayaos.prohost.cloud status
```

Do **not** tell the user to run `git config --global --add safe.directory` unless they explicitly want a permanent VPS fix. Prefer the `-c` one-shot flag in deploy snippets.

---

## Standard deploy snippet

Copy-paste block for production (use as-is when asked for VPS deployment commands):

```bash
cd /www/wwwroot/khayaos.prohost.cloud
git -c safe.directory=/www/wwwroot/khayaos.prohost.cloud pull origin main
git -c safe.directory=/www/wwwroot/khayaos.prohost.cloud log -1 --oneline
cd backend && /www/server/php/83/bin/php artisan migrate --force
cd ../frontend && rm -rf .next && npm run build
pm2 restart khayaos-frontend khayaos-queue khayaos-reverb
```

After deploy:

1. Hard-refresh the browser (Ctrl+Shift+R), or open an **Incognito/Private** window.
2. If styles are still stale: DevTools → Application → **Clear site data** for `khayaos.prohost.cloud`, then reload.
3. Confirm the deploy commit with `git log -1` on the VPS matches the expected hash below.

---

## Optional — permanent safe.directory on VPS

Run once on the server if you want all git commands to work without `-c`:

```bash
git config --global --add safe.directory /www/wwwroot/khayaos.prohost.cloud
```
