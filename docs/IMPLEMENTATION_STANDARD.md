# KhayaOS Implementation Standard

**Status:** Mandatory for all contributors and AI agents  
**Effective:** 2026-07-04  
**Reference implementation:** Phase 1.0.2 SaaS Commercialization Layer (`ffa9d2f`)

This document is the single source of truth for how every feature on KhayaOS must be built. Read it before writing code. The standard is not optional.

---

## 1. Last Edit Summary (2026-07-13)

**Catalog sync fix:** `PricingSeeder` now `updateOrCreate`s features (not `firstOrCreate`) so Feature Library stays aligned with the codebase; VPS deploy always runs `PricingSeeder` after migrate.

The most recent production work is **Engagement Messaging, Likes & Reviews** (platform↔tenant push/email/chat, tenant↔customer chat, menu likes + WhatsApp refer, kitchen reviews + footer ticker, plan entitlements). Reference depth remains Phase 1.0.2 (`ffa9d2f`).

### What shipped

| Area | Deliverables |
|------|--------------|
| **Engagement backend** | Module `App\Modules\Engagement`; migration `2026_07_13_044000_engagement_messaging_likes_reviews.php`; platform messaging/chat/staff APIs; tenant inbox/reviews; customer like/refer/review/chat; feature keys on Growth/Professional+ |
| **Engagement frontend** | `/platform/inbox`, `/platform/staff`; tenant `/inbox`, `/reviews`; menu like/refer modal; review form; customer chat; footer `ReviewTicker` |
| **QA** | `EngagementFeaturesTest.php` (5); full suite 71 passed; `npm run build` passed |
| **Audit docs** | `docs/audit/18_*`, `19_*`, `20_*` implementation, QA, and release reports |

### Prior reference — Phase 1.0.2 (`ffa9d2f`)

| Area | Deliverables |
|------|--------------|
| **SaaS backend** | Plan/feature CRUD, plan limits, tenant entitlements, override service with audit trail, limit enforcement hooks (menu, campaigns, delivery zones), extended `PricingSeeder`, migration `2026_07_04_100000_commercialization_layer.php` |
| **SaaS frontend** | Platform pages: `/platform/pricing`, `/platform/features`, `/platform/feature-assignments`, `/platform/billing`; public `/pricing`; `UpgradeLimitModal`; extended types and `pricing.service.ts` |
| **Customer UX** | Home at `/`; welcome splash + 45s notification opt-in; full-width news ticker (Super Admin + tenant CRUD); PWA manifest/service worker fixes |
| **Auth fix** | Super Admin login no longer scoped by stray `X-Tenant-Slug` header |
| **UI polish** | “Our Featured Meal” section with animations; ticker on dedicated header row (52s scroll, bold text) |
| **QA** | `SaasCommercializationTest.php` (10 tests); full backend suite passing; frontend build passing |
| **Audit docs** | `docs/audit/12_*`, `13_*`, `14_*` implementation, QA, and release reports |

### Prior commits in the same release window

| Commit | Summary |
|--------|---------|
| `8b753b7` | Splash, ticker, PWA, home at `/` |
| `a731cde` | Ticker backfill + API/frontend fallbacks |
| `65ac0fd` | Fix super admin login |
| `ffa9d2f` | Phase 1.0.2 SaaS + UI polish |

### VPS deploy (production)

> **CRITICAL — Git on VPS:** The repo at `/www/wwwroot/khayaos.prohost.cloud` triggers `fatal: detected dubious ownership` when running as root. **Always prefix git commands** with `-c safe.directory=/www/wwwroot/khayaos.prohost.cloud`. Never give deploy snippets with bare `git pull` or `git log`. Full reference: `docs/VPS_DEPLOY.md`.

```bash
cd /www/wwwroot/khayaos.prohost.cloud
git -c safe.directory=/www/wwwroot/khayaos.prohost.cloud pull origin main
git -c safe.directory=/www/wwwroot/khayaos.prohost.cloud log -1 --oneline
cd backend && composer install --no-dev --optimize-autoloader
/www/server/php/83/bin/php artisan migrate --force
/www/server/php/83/bin/php artisan db:seed --class=PricingSeeder --force
/www/server/php/83/bin/php artisan config:clear
cd ../frontend && npm install && rm -rf .next && npm run build
pm2 restart khayaos-frontend khayaos-queue khayaos-reverb
```

> `node_modules/`/`vendor/` are git-ignored — always run `npm install` + `composer install` after pull, or builds fail with `Module not found` when a dependency was added. Always run `PricingSeeder` so Feature Library keys and plan entitlements stay in sync with the codebase (`updateOrCreate`).

Verify: `git -c safe.directory=/www/wwwroot/khayaos.prohost.cloud log -1 --oneline` → latest commit on `main`. Hard-refresh browser after deploy.

---

## 2. Approved Approach — Mandatory for Every Feature

The Phase 1.0.2 prompt established the **Implementation Mode** contract. That contract is now the permanent KhayaOS standard.

### 2.1 Mindset

- **Implementation mode, not design mode.** Ship complete, production-ready work.
- **Extend, never replace.** Reuse existing services, controllers, policies, events, migrations, feature flags, RBAC, and UI components. Do not create parallel implementations.
- **Complete only.** No TODOs, placeholders, scaffolds, mockups, or “UI-only” features. If a requirement exists, it must work end-to-end.
- **Inspect first.** Read the codebase and `/docs` (numerical order) before writing a single line of code.

### 2.2 Architecture (non-negotiable)

| Rule | Requirement |
|------|-------------|
| Stack | Laravel modular monolith + Next.js PWA + PostgreSQL + Sanctum |
| Module boundaries | No cross-module direct dependencies; communicate via services + events |
| Business logic | Lives in services only — `Controller → Service → Repository → Database` |
| Tenancy | Every tenant-scoped table has `tenant_id`; queries must respect isolation |
| Feature flags | Wrap module access; extend the existing dual system (legacy flags + plan entitlements) |
| API changes | Additive only — no breaking changes to existing contracts |
| Auth | Preserve existing RBAC; extend middleware/policies, do not bypass |

### 2.3 Backend requirements

Every feature that mutates data must include:

1. **Migration(s)** — schema changes with reversible down methods where practical  
2. **Models + relationships** — follow existing module layout under `app/Modules/` and `app/Shared/`  
3. **Service layer** — all business rules and limit/feature checks enforced here, not in controllers  
4. **Controllers** — thin; validation via Form Requests; authorization via policies/middleware  
5. **Routes** — registered in `routes/api.php` with correct tenant/platform middleware  
6. **Audit logging** — all platform mutations and entitlement overrides logged with actor + reason  
7. **Limit/feature enforcement** — enforced in API/services; hiding nav items alone is insufficient. New billable feature keys must be added to `PricingSeeder` (and plan matrices); deploy always re-runs that seeder.  
8. **PHPUnit tests** — feature tests for happy path, authorization, and limit violations  

### 2.4 Frontend requirements

Every user-facing feature must include:

1. **Types** — extend `frontend/lib/types.ts` (or module types) to match API responses  
2. **Service layer** — API calls in `frontend/services/`, not scattered in components  
3. **UI components** — reuse `Card`, `Button`, `Input`, `Badge`, `ModalPortal`; Anek font; existing color tokens  
4. **Route groups** — customer `(customer)/`, admin `(admin)/`, platform `(platform)/`; no dead routes  
5. **Error handling** — use existing patterns (`lib/limit-error.ts`, toast/alert components)  
6. **Build gate** — `npm run build` must pass with zero errors  

**UI standard:** Bespoke KhayaOS look — not generic admin templates. Match platform dark theme and customer warm palette from `docs/03-ui-design-system.md`.

### 2.5 Security and tenancy

- Platform routes require `platform.super_admin` (or documented equivalent middleware).  
- Tenant owners cannot modify plans, overrides, or other tenants’ data.  
- Never send `X-Tenant-Slug` on `/auth/login` — login is global.  
- Sanitize and validate all inputs; use existing CSRF/token patterns via Sanctum.

### 2.6 QA gate (must pass before merge/deploy)

| Check | Command / criterion |
|-------|---------------------|
| Backend tests | `cd backend && php artisan test` — all pass |
| Frontend build | `cd frontend && npm run build` — no errors |
| Lint | No new linter errors in touched files |
| Manual smoke | Critical paths exercised on local or staging |
| Audit doc | Non-trivial features get an entry under `docs/audit/` |

### 2.7 Documentation

- Update relevant `/docs` specs when behavior or API contracts change.  
- For phase-sized work, add implementation + QA + release reports (see `docs/audit/12–14_*` as template).  
- Do not create markdown files the user did not ask for unless they are required audit/standard docs.

### 2.8 Deployment

- Migrations run from **`backend/`**, not site root.  
- Frontend requires **`npm run build`** after pull — PM2 serves the production build.  
- Restart all three PM2 apps: `khayaos-frontend`, `khayaos-queue`, `khayaos-reverb`.  
- Post-deploy: advise hard refresh if users see stale Server Action errors (browser cache).

### 2.9 What is forbidden

- TODO comments substituting for implementation  
- Duplicate services/controllers for functionality that already exists  
- Business logic in React components or Laravel controllers  
- UI-only feature gates without backend enforcement  
- Breaking existing API response shapes  
- Generic third-party admin themes that ignore KhayaOS design tokens  
- Skipping tests for “small” backend changes that affect authorization or limits  

---

## 3. Workflow Checklist

Use this checklist for every feature request:

```
[ ] Read docs/IMPLEMENTATION_STANDARD.md (this file)
[ ] Read relevant /docs specs (00–08) for the domain
[ ] Search codebase for existing services, routes, and UI to extend
[ ] Design additive schema/API changes
[ ] Implement backend: migration → models → services → controllers → tests
[ ] Implement frontend: types → services → pages/components → build
[ ] Run php artisan test && npm run build
[ ] Write or update docs/audit report if phase-sized
[ ] Deploy using VPS commands in §1
```

---

## 4. Related Documents

| Document | Purpose |
|----------|---------|
| `docs/07-implementation-strategy.md` | Folder structure, module patterns, event rules |
| `docs/03-ui-design-system.md` | Visual and component standards |
| `docs/06-authentication-tenant-system.md` | Auth, tenancy, headers |
| `docs/audit/12–14_PHASE_1_0_2_*.md` | Reference implementation reports |
| `.cursor/rules/khayaos-implementation-standard.mdc` | Cursor agent enforcement |
| `frontend/AGENTS.md` | Frontend agent entry point |

---

## 5. Change Log

| Date | Change |
|------|--------|
| 2026-07-04 | Initial standard published after Phase 1.0.2 (`ffa9d2f`) |
