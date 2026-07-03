# KhayaOS Phase 1 Pilot — Technical Debt

**Audit date:** 2026-07-03

---

## Dead Code

| Item | Location | Notes |
|------|----------|-------|
| `CustomerNav` component | `frontend/components/customer/CustomerNav.tsx` | Fully implemented bottom nav; **not imported anywhere** |
| Laravel default users migration | `backend/database/migrations/0001_01_01_000000_create_users_table.php` | Creates `sessions`/`password_reset_tokens` only; confusing alongside KhayaOS users migration |
| `UserFactory` wrong model | `backend/database/factories/UserFactory.php` | References `App\Models\User` instead of `App\Modules\Auth\Domain\Models\User` |

---

## Duplicate Code / Logic

| Item | Locations | Notes |
|------|-----------|-------|
| Restaurant status UI | `frontend/app/(admin)/branding/page.tsx`, `frontend/app/(platform)/platform/tenants/page.tsx` | Status override forms duplicated between tenant admin and platform |
| Status option constants | `branding/page.tsx`, `platform/tenants/page.tsx` | Same `STATUS_OPTIONS` array duplicated |
| Feature flag systems | `feature_flags` table + `plan_features` / entitlements | Two parallel gating mechanisms; `FeatureAccessService` merges with fallback |
| Realtime order status | `GET /realtime/order-status/{id}` on public and auth groups | Same endpoint registered twice in `api.php` |
| Dashboard data fetching | `dashboard.service.ts`, `analytics.service.ts` | Client recomputes metrics from raw orders/menu |

---

## Temporary Workarounds

| Item | Location | Notes |
|------|----------|-------|
| Push notification stub | `PushNotificationService::deliverToToken()` | Logs instead of sending when `webpush.enabled` false |
| WhatsApp provider stub | WhatsApp provider implementation | Logs/skips without credentials |
| Checkout error message | `checkout/page.tsx` | Generic "Please sign in" masks auth wall — misleading UX |
| `applicationServerKey: undefined` | `NotificationOptInPrompt.tsx` | Push subscribe called knowing it will fail |
| Platform demo mode | `config/pricing.php` `PLATFORM_DEMO_MODE` | May bypass real subscription checks |

---

## TODOs / FIXMEs

**Source scan result:** No `TODO`, `FIXME`, `HACK`, or `XXX` comments found in backend PHP or frontend TS/TSX.

Implicit incomplete work is tracked via:
- `ComingSoonModal` components
- Platform module status `coming-soon`
- Stub notification providers

---

## Hardcoded Values

| Value | Location | Risk |
|-------|----------|------|
| `http://localhost:8000/api/v1` | `frontend/lib/api-client.ts`, login page, settings | Dev default exposed in production if env unset |
| `localhost` WebSocket host | `backend/config/realtime.php` | Broken realtime if not overridden |
| Demo passwords in seeder | `backend/database/seeders/DatabaseSeeder.php` | Known credentials if seeder run in prod |
| Cache name `khaya-kitchen-v1` | `frontend/public/sw.js` | Manual bump required for SW updates |
| Kitchen poll interval 4–5s | `frontend/app/(admin)/kitchen/page.tsx` | Not adaptive to battery/background |
| Opt-in prompt delay 1200ms | `NotificationOptInPrompt.tsx` | Arbitrary |
| CORS `*` | `backend/config/cors.php` | Production security risk |
| Sanctum stateful domains | `backend/config/sanctum.php` | Includes localhost entries |

---

## Unused Components

| Component | Path |
|-----------|------|
| `CustomerNav` | `frontend/components/customer/CustomerNav.tsx` |

---

## Refactoring Opportunities

| Area | Suggestion | Priority |
|------|------------|----------|
| Menu admin API surface | Extend `menu.service.ts` + consolidate meal/option DTOs | High |
| API client | Add retry queue, offline detection, request deduplication | High |
| Permission enforcement | Middleware-level permission checks vs scattered `authorize()` in services | Medium |
| Order DTOs | Dedicated API resources/transformers instead of raw model arrays | Medium |
| Analytics | Move `analytics.service.ts` aggregation to `DashboardService` | Medium |
| Feature gating | Consolidate feature_flags + plan_features into single source | Medium |
| Migration integrity | Single migration adding FKs + missing indexes | High |
| Auth model | Separate customer session (phone OTP or guest token) from staff Sanctum | High |
| Test factories | Fix UserFactory; add factories for Order, Meal, Tenant | High |

---

## Architecture Drift (vs Bible / Implementation Strategy)

| Expected | Actual | Drift |
|----------|--------|-------|
| `infrastructure/` folder | Missing | Minor |
| Policies per module | Not implemented | Medium |
| No cross-module direct deps | Mostly events; some direct service injection acceptable in monolith | Low |
| Payment in order flow | Absent | Critical |
| Customer PWA ordering without staff login | Requires staff token | Critical |
| `inventory_impact` on options | Column missing | Medium |
| OpenAPI contract | None | Low |
| Module Policies folder | Empty across modules | Medium |

---

## Performance Debt (pre-optimization)

| Item | Impact |
|------|--------|
| No route-level code splitting for admin | Large JS on first load |
| No list virtualization | Orders/kitchen slow at scale |
| No image format optimization (WebP/AVIF) | `MealImage` uses next/image but limited src sets |
| Full order objects over WebSocket | Payload size |
| Database cache/queue default to SQLite in dev | Differs from docker postgres/redis |

---

## Documentation Debt

| Item | Notes |
|------|-------|
| No OpenAPI / Postman collection | API spec in markdown only |
| `.env.example` may not document all vars | VAPID, WhatsApp, Reverb public host |
| No runbook for pilot deployment | Docker compose is dev-oriented |

---

*Debt items tied to Critical/High gaps are addressed in `02_GAP_ANALYSIS.md` fix plan first.*
