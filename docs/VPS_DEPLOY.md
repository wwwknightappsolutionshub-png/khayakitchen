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

## Permanent VPS fix (do this once)

These three server steps permanently stop the admin spinner class of bugs (stale HTML → missing `/_next/static` chunks).

### 1) Always deploy with the safe script (never rebuild `.next` while Next is online)

```bash
bash /www/wwwroot/khayaos.prohost.cloud/scripts/vps-deploy.sh
```

Or the manual block below. **Never** run `rm -rf .next && npm run build` while `khayaos-frontend` is online.

### 2) Disable / purge aaPanel site cache for this domain

In aaPanel → Website → `khayaos.prohost.cloud` → **Config** / **Cache**:
- Turn **off** proxy/page cache for HTML if enabled.
- After each deploy, purge the site cache once if the panel has a Purge button.

### 3) Lock Nginx so admin/login HTML is never cached

In aaPanel → Website → `khayaos.prohost.cloud` → Config, place the block in **Nginx cache guidance** below **before** the Laravel `/api` location, then:

```bash
nginx -t && nginx -s reload
```

Verify a bad shell cannot return after deploy:

```bash
bash /www/wwwroot/khayaos.prohost.cloud/scripts/verify-frontend-chunks.sh
```

---

## Standard deploy snippet

**Preferred (permanent):**

```bash
bash /www/wwwroot/khayaos.prohost.cloud/scripts/vps-deploy.sh
```

Manual copy-paste (same safe order):

```bash
cd /www/wwwroot/khayaos.prohost.cloud
git -c safe.directory=/www/wwwroot/khayaos.prohost.cloud pull origin main
git -c safe.directory=/www/wwwroot/khayaos.prohost.cloud log -1 --oneline
cd backend
/www/server/php/83/bin/php "$(command -v composer)" install --no-dev --optimize-autoloader --no-interaction || true
/www/server/php/83/bin/php artisan migrate --force
/www/server/php/83/bin/php artisan db:seed --class=PricingSeeder --force
/www/server/php/83/bin/php artisan ops-pwa:schedule-existing-nudges
/www/server/php/83/bin/php artisan config:clear
pm2 stop khayaos-frontend
cd ../frontend && npm install && rm -rf .next && npm run build
pm2 start khayaos-frontend
pm2 restart khayaos-queue khayaos-reverb
bash ../scripts/verify-frontend-chunks.sh
```

> **Dependencies (required):** `node_modules/` and `vendor/` are git-ignored, so **every deploy must run `npm install`** (frontend) **and `composer install`** (backend) after `git pull`. Skipping `npm install` causes `Module not found` build failures whenever a new package was added (e.g. `country-state-city`). `config:clear` is required so `.env` changes like `FRONTEND_URL` take effect.

> **Feature catalog (required):** Always run `PricingSeeder` after migrate. It `updateOrCreate`s billable features and re-syncs Starter/Growth/Professional/Enterprise plan feature matrices so Feature Library and entitlements stay aligned with the codebase. Safe to re-run; it does not wipe tenant subscriptions or per-tenant overrides.

---

## WhatsApp / queue stuck (hours of silence, then a flood)

This VPS uses **`QUEUE_CONNECTION=database`**. If `khayaos-queue` dies, points at **redis** (no php-redis), or leaves jobs **reserved**, WhatsApp sits for hours and then dumps when the worker comes back.

**Unstick now (on VPS):**

```bash
bash /www/wwwroot/khayaos.prohost.cloud/scripts/vps-queue-health.sh
pm2 logs khayaos-queue --lines 80
```

### Flush WhatsApp backlog (protect Genius monthly quota)

If Genius was down / over quota and jobs piled up, clear WhatsApp jobs **before** reconnecting so reconnect does not replay the backlog:

```bash
cd /www/wwwroot/khayaos.prohost.cloud/backend
pm2 stop khayaos-queue
/www/server/php/83/bin/php artisan whatsapp:flush-queue --dry-run
/www/server/php/83/bin/php artisan whatsapp:flush-queue --failed --force
pm2 start khayaos-queue
```

- Default flushes only `SendWhatsAppMessageJob` + `SendSignupWelcomeWhatsAppJob`.
- Add `--include-mixed` to also flush promo/campaign/revenue jobs that may WhatsApp (those can also carry email/push).
- Do **not** run `queue:retry all` after a quota outage unless you intend to resend.

Confirm:

1. `QUEUE_CONNECTION=database` and worker args include `queue:work database` (not `redis`).
2. `pending` drops toward 0 while logs show `WhatsApp (Genius): message sent` / `Signup welcome`.
3. PM2 `status` stays `online` and restarts after `--max-time` (worker recycles; that is expected).

Do **not** use `queue:work redis` on this host unless php-redis is installed and Redis is the intentional queue backend.

---

Why the frontend is stopped before `rm -rf .next`: `next start` serves route HTML from the running process while chunks are loaded from `.next/static`. If `.next` is deleted while the old process is still serving traffic, users can receive old HTML that references deleted chunks, producing permanent `/_next/static/... 404` spinners.

After deploy:

1. Hard-refresh the browser (Ctrl+Shift+R), or open an **Incognito/Private** window.
2. If styles are still stale: DevTools → Application → **Clear site data** for `khayaos.prohost.cloud`, then reload.
3. Confirm the deploy commit with `git log -1` on the VPS matches the expected hash below.
4. **PWA auto-update:** clients poll `/app-version` on load (not `/api/*` — that path is proxied to Laravel). A new Next.js `BUILD_ID` triggers an automatic SW/cache reset. Users may also tap **Update now** on the in-app banner.
5. **Nginx / BT Panel:** disable HTML proxy cache for this site, or purge panel cache after deploy. Stale Nginx responses can repopulate client caches even after `/reset-app` or a private-window test.

---

## Production ports (this VPS)

| Service | Port | Notes |
|---------|------|--------|
| KhayaOS Next.js (`khayaos-frontend`) | **3004** | PM2 cwd: `.../frontend` |
| KhayaOS Laravel API | **8080** | Nginx `location /api` |
| Other apps | 3000, 3001, … | Do not use 3000 for KhayaOS tests |

**Verify after deploy:**

```bash
curl -s http://127.0.0.1:3004/app-version.json
curl -s https://khayaos.prohost.cloud/app-version.json
```

Both must return JSON like `{"build":"..."}` — not HTML or `Not found`.

If the public URL fails but port 3004 works, add this **before** the Laravel `/api` block in aaPanel → Website → Config:

```nginx
location = /app-version.json {
    proxy_pass http://127.0.0.1:3004;
    add_header Cache-Control "no-cache, no-store, must-revalidate";
}

location = /app-version {
    proxy_pass http://127.0.0.1:3004;
    add_header Cache-Control "no-cache, no-store, must-revalidate";
}

# PWA start_url — Next.js was serving a cached shell for "/"; force revalidation at nginx
location = / {
    proxy_pass http://127.0.0.1:3004;
    proxy_http_version 1.1;
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;
    proxy_no_cache 1;
    proxy_cache_bypass 1;
    proxy_hide_header Cache-Control;
    add_header Cache-Control "no-cache, no-store, must-revalidate" always;
}
```

Then `nginx -t && nginx -s reload`.

---

## Nginx cache guidance (recommended)

KhayaOS frontend nginx `proxy_pass` should target **port 3004**. Ensure HTML and the service worker are never cached by Nginx. Only long-cache hashed assets under `/_next/static/`:

```nginx
location /sw.js {
    proxy_pass http://127.0.0.1:3004;
    add_header Cache-Control "no-cache, no-store, must-revalidate";
}

location /app-version.json {
    proxy_pass http://127.0.0.1:3004;
    add_header Cache-Control "no-cache, no-store, must-revalidate";
}

location /app-version {
    proxy_pass http://127.0.0.1:3004;
    add_header Cache-Control "no-cache, no-store, must-revalidate";
}

location ~ ^/(login|admin|platform|orders|kitchen|inventory|crm|loyalty|inbox|reviews|seasonal-promo|marketing|revenue-recovery|branding|reports|staff-performance|settings)(/.*)?$ {
    proxy_pass http://127.0.0.1:3004;
    proxy_http_version 1.1;
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;
    proxy_no_cache 1;
    proxy_cache_bypass 1;
    proxy_hide_header Cache-Control;
    add_header Cache-Control "no-cache, no-store, must-revalidate" always;
}

location /_next/static/ {
    proxy_pass http://127.0.0.1:3004;
    add_header Cache-Control "public, max-age=31536000, immutable";
}
```

Do **not** put the version endpoint under `/api/` — that location is reserved for Laravel on this server.

---

## Optional — permanent safe.directory on VPS

Run once on the server if you want all git commands to work without `-c`:

```bash
git config --global --add safe.directory /www/wwwroot/khayaos.prohost.cloud
```
