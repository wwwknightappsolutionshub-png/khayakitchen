# 26 — Scoped PWA split (Phase B)

**Date:** 2026-07-31  
**Status:** Complete (P0–P2 partials closed)  
**Post-fix audit:** 2026-08-01 — PASS  
**Depends on:** Phase A (`docs/audit/25_SCOPED_PWA_SPLIT.md`)

## Goal

Browser-enforced Ops isolation on one origin (no dual hosts):

| Surface | Manifest | `id` | `start_url` | `scope` | Service worker |
|---------|----------|------|-------------|---------|----------------|
| **Order** | `/pwa-manifest/{slug}` | `/r/{slug}` | `/r/{slug}` | `/` (storefront routes) | `/sw.js` |
| **Ops** | `/manifest-ops.json` | `/ops` | `/ops/login` | `/ops/` | `/ops/sw.js` |

## What shipped

### Route prefix
- Physical App Router move: admin, auth, platform, marketing, public pricing, reset-app → `app/ops/**`
- Canonical URLs: `/ops/login`, `/ops/orders`, `/ops/kitchen`, `/ops/platform/*`, `/ops/get-started`, `/ops/pricing`, …
- Customer storefront stays at `/`, `/r/{slug}`, `/menu`, `/cart`, `/checkout`, `/tracking`, `/account`, `/offline`

### Compatibility
- Permanent redirects in `next.config.ts` via `LEGACY_OPS_REDIRECT_SOURCES` (`lib/ops-paths.ts`)
- Includes `/ops` → `/ops/login` and legacy `/login`, `/orders`, `/platform/*`, `/get-started`, `/pricing`, …

### Path helpers
- `lib/ops-paths.ts` — `opsPath()`, `OPS_ROUTES`, `isOpsPath()`, redirect table
- Sidebars, `useAuth`, auth guards, `WrongSurfaceBanner` consume `OPS_ROUTES`
- `inferPwaSurface()` → `isOpsPath(path) ? "ops" : "customer"`

### Dual service workers
- Customer: `public/sw.js` registered with `scope: "/"`
- Ops: `public/ops/sw.js` registered with `scope: "/ops/"` (+ `updateViaCache: "none"` + forced `update()`)
- `PwaLifecycle` registers by surface; push defaults are surface-specific
- Cache epoch `16`
- Residual: customer root scope can observe `/ops/*` until Ops SW claims those clients; installed Ops chrome is still limited by manifest scope

### Backend deep links
- Staff invite / welcome / verify-email / reset-password → `/ops/…`
- Referral links → `/ops/get-started?ref=…`
- Accounts `orders_path` → `/ops/orders`
- Staff chat push `url` → `/ops/inbox`

### Partials closed (2026-08-01)

| Pri | Gap | Resolution |
|-----|-----|------------|
| P0 | Uncommitted Phase A+B | Commit on `main` |
| P1 | Thin deep-link/SW/redirect tests | `OpsPhaseBContractTest` |
| P1 | Unsafe rewrite script | Deleted `scripts/rewrite-ops-paths.mjs` |
| P1 | SW overlap | Ops register forces update; documented residual |
| P2 | `OPS_ROUTES` unused | Wired into nav/guards/auth/banner |
| P2 | Stale Phase A paths | Doc refreshed |
| P2 | Bare `/ops` 404 | Redirect → `/ops/login` |

### Explicitly not in Phase B
- Dual hosts (separate subdomain/origin)
- Full customer nesting under `/r/{slug}/menu|cart|…`

## QA

- `php artisan test --filter=OpsPhaseBContractTest`
- `php artisan test --filter=TenantPwaManifestTest`
- `npm run build`

## Exit criteria

1. Ops PWA `scope` is `/ops/` and `start_url` is `/ops/login` ✅
2. Legacy Ops URLs permanently redirect under `/ops` ✅
3. Two SWs with matching scopes ✅
4. Staff emails/push deep links use `/ops/*` ✅
5. Build + Ops manifest/contract tests pass ✅
