# KhayaOS Phase 1 Pilot — Verification Report

**Date:** 2026-07-03  
**Sprint type:** End-to-end verification (no feature implementation)  
**Sources:** `docs/audit/10_RELEASE_READINESS_REPORT.md`, `docs/audit/02_GAP_ANALYSIS.md`, live codebase execution  
**Verifier environment:** Windows 10, PHP backend + Next.js frontend (Docker not installed on host)

---

## Executive Summary

| Metric | Result |
|--------|--------|
| **Overall pilot readiness** | **CONDITIONAL PASS** — core order lifecycle verified via automated tests; several checklist items fail or could not be live-tested |
| Backend tests | **PASS** (5 tests, 25 assertions) |
| Frontend typecheck | **PASS** |
| Frontend production build | **PASS** (after route defect fix — see Defects Fixed During Sprint) |
| Frontend lint | **FAIL** (4 errors) |
| Frontend unit/E2E tests | **NONE** |
| Docker / Reverb / Queue live stack | **NOT EXECUTED** (Docker unavailable on verification host) |
| Browser / mobile viewport manual QA | **NOT EXECUTED** (code review + responsive patterns only) |

The release readiness report claims ~92% complete and **APPROVED FOR PILOT**. Verification confirms the **backend customer→staff order lifecycle works** when exercised through PHPUnit, but **production deploy gates (lint), delivery workflow, kitchen pending visibility, platform branding override, and repeat-order UX** remain open.

---

## Defects Fixed During Sprint

| Issue | Action | Result |
|-------|--------|--------|
| Admin `/menu` and customer `/menu` route collision blocked `next build` | Moved admin page to `/admin/menu`; updated `components/ui/Sidebar.tsx` | Build **PASS** |

---

## Customer Journey

Simulated via `CustomerOrderTest`, `OrderLifecycleTest`, and static analysis of PWA checkout/storefront code.

| Step / Check | Status | Evidence |
|--------------|--------|----------|
| Customer opens PWA | **PASS** | Next.js customer routes build; `(customer)/layout.tsx` mounts shell + nav |
| Restaurant branding loads | **PASS** | `GET /storefront` via `useStorefront()`; branding from tenant config |
| Restaurant status displayed | **PASS** | Checkout blocks when `is_accepting_orders === false` |
| Menu loads | **PASS** | Public `GET /menu`; customer `/menu` page |
| Meal selected | **PASS** | Cart store + menu item flow |
| Add-ons selected | **PASS** | Option groups on menu; options passed in checkout payload |
| Pickup or delivery selected | **WARNING** | UI collects delivery + address; address **not sent to API** and not stored on `orders` |
| Scheduled time selected | **PASS** | `datetime-local` on checkout; `scheduled_time` validated and persisted |
| Name + phone entered | **PASS** | Zod schema on checkout form |
| Order submitted | **PASS** | `POST /api/v1/customer/orders` returns 201 |
| Customer record created or reused | **PASS** | `CrmService::findOrCreateByPhone` in `OrderService::createCustomerOrder`; asserted in `CustomerOrderTest` |
| Order created | **PASS** | `CustomerOrderTest` |
| Order linked to customer | **PASS** | `customer_id` returned and stored in DB |
| Payment record created | **PASS** | `payments` row with `status=paid` on customer order |
| Inventory not deducted yet | **PASS** | `OrderLifecycleTest` asserts stock unchanged until `completed` |
| Kitchen receives order | **WARNING** | `NewKitchenTicket` WebSocket event fires on create; **kitchen API list excludes `pending`** — ticket not in KDS until owner accepts |
| CRM updated | **PASS** | `UpdateCrmOnOrderCreated` listener; CRM profile exists after lifecycle test |
| Loyalty pending | **PASS** | No points until `completed`; asserted in `OrderLifecycleTest` |

### Customer Journey FAIL / WARNING Detail

#### WARNING — Delivery address not persisted

| Field | Detail |
|-------|--------|
| **Reason** | Checkout validates `address` for delivery but `placeOrder` payload omits it; `CustomerOrderController` has no address field; `orders` table has no address column |
| **Affected files** | `frontend/app/(customer)/checkout/page.tsx`, `backend/app/Modules/Orders/Interfaces/Controllers/CustomerOrderController.php`, `backend/database/migrations/2026_07_03_000008_create_orders_table.php` |
| **Required fix** | Add delivery address to order (column or `delivery_orders` auto-create on checkout when `order_type=delivery`) |
| **Effort** | 1–2 days |

#### WARNING — Kitchen list hides pending orders

| Field | Detail |
|-------|--------|
| **Reason** | `OrderService::getKitchenOrders()` filters `accepted`, `preparing`, `ready` only — new customer orders stay `pending` until accepted on Orders page |
| **Affected files** | `backend/app/Modules/Orders/Application/Services/OrderService.php`, `frontend/app/(admin)/kitchen/page.tsx` |
| **Required fix** | Include `pending` in kitchen query **or** document accept-on-orders as required pilot step; align with product expectation |
| **Effort** | 0.5 day |

---

## Staff Journey

Verified via `OrderLifecycleTest` (API status transitions) + code review of admin UI and event listeners.

| Step / Check | Status | Evidence |
|--------------|--------|----------|
| Login as Owner | **PASS** | Sanctum login; seeded `owner@khayaos.com` |
| Dashboard loads | **PASS** | `/dashboard` + KPI APIs behind auth |
| New order visible | **PASS** | `GET /orders` includes `pending` |
| Accept → Cooking → Ready → Completed | **PASS** | `OrderLifecycleTest` patches status through full flow |
| Inventory deducted | **PASS** | Stock decreases after `completed` in lifecycle test |
| Recipe mapping correct | **WARNING** | `resolvePortionSize()` maps option names containing small/medium/large; not live-tested with multi-portion recipes |
| CRM updated | **PASS** | `UpdateCrmOnOrderCompleted` on `OrderCompleted` event |
| Loyalty awarded | **PASS** | Points > 0 after completed in lifecycle test |
| Realtime update sent | **WARNING** | `BroadcastRealtimeOrderUpdates` registered; Reverb not live-tested on this host |
| Customer notification triggered | **WARNING** | In-app + WhatsApp jobs dispatch; push on status change only; no live provider credentials |
| Audit log created | **WARNING** | Order events log to `domain_event_logs` via `DomainEventLogger`, **not** `audit_logs` table used by audit UI |

### Staff Journey WARNING Detail

#### WARNING — Order lifecycle audit not in audit_logs UI

| Field | Detail |
|-------|--------|
| **Reason** | Status changes write to `domain_event_logs`; tenant audit page reads `audit_logs` (pricing/platform actions) |
| **Affected files** | `backend/app/Shared/Events/DomainEventLogger.php`, `backend/app/Modules/Pricing/Interfaces/Controllers/AuditLogController.php` |
| **Required fix** | Mirror order status events into `audit_logs` or expose `domain_event_logs` in audit UI |
| **Effort** | 1 day |

---

## Super Admin

Verified via route inventory + platform UI pages (no live browser session).

| Capability | Status | Notes |
|------------|--------|-------|
| Tenant CRUD | **PASS** | `POST/PUT/DELETE /platform/tenants` + UI at `/platform/tenants` |
| Plan CRUD | **PASS** | Platform pricing plan endpoints + `/platform/pricing` |
| Feature CRUD | **PASS** | `PlatformFeatureController` |
| Pricing CRUD | **PASS** | Plans, subscriptions, override |
| Branding override | **FAIL** | Platform can override **restaurant status** only; no tenant branding (colors/logo) override API or UI |
| Coming Soon modules | **PASS** | `/platform/modules` lists scaffolded Phase 2 modules |
| Platform dashboard | **PASS** | `/platform/dashboard` |
| Platform statistics | **PASS** | `GET /platform/dashboard` |
| Audit logs | **PASS** | `/platform/audit` + `GET /platform/audit-logs` |
| No DB edits required | **PASS** | Tenant create form provisions owner user |

### Super Admin FAIL Detail

#### FAIL — Platform branding override missing

| Field | Detail |
|-------|--------|
| **Reason** | Verification checklist requires super-admin branding override; codebase only has tenant self-service `/branding` and platform **restaurant status** override |
| **Affected files** | `backend/routes/api.php`, `frontend/app/(platform)/platform/tenants/page.tsx`, `backend/app/Modules/TenantBranding/` |
| **Required fix** | Add `PATCH /platform/tenants/{id}/branding` + UI fields for primary/secondary colors, logo URL |
| **Effort** | 1–2 days |

---

## Menu Management

Verified via admin menu page + menu API routes (no live browser CRUD session).

| Capability | Status | Notes |
|------------|--------|-------|
| Create meal | **PASS** | `POST /menu/meals` + admin form |
| Edit meal | **PASS** | `PUT /menu/meals/{id}` |
| Delete meal | **PASS** | `DELETE /menu/meals/{id}` |
| Upload image | **WARNING** | **URL text field only** — no file upload/storage |
| Change price | **PASS** | `base_price` on meal form |
| Toggle availability | **PASS** | `is_active` toggle |
| Create option groups | **PASS** | Option group API + UI |
| Create add-ons | **PASS** | Meal option API + UI |
| Change option pricing | **PASS** | `price_delta` on options |
| Disable option | **PASS** | Option update/delete |
| Immediately visible on PWA | **PASS** | Public menu reads same DB; React Query refetch on admin save (manual refresh may be needed if cached — **WARNING** for stale cache without navigation) |

### Menu Management WARNING Detail

#### WARNING — Image upload is URL-only

| Field | Detail |
|-------|--------|
| **Reason** | Admin form field `image_url` string; no S3/local upload endpoint |
| **Affected files** | `frontend/app/(admin)/admin/menu/page.tsx` |
| **Required fix** | Add media upload endpoint + file picker, or document URL-only as pilot limitation |
| **Effort** | 2–3 days (full upload) / 0 (document limitation) |

---

## Inventory

Verified via API surface, `InventoryService`, and lifecycle test deduction.

| Capability | Status | Notes |
|------------|--------|-------|
| Create ingredient | **PASS** | `POST /inventory/items` + admin UI |
| Stock In | **PASS** | `POST /inventory/stock-in` |
| Waste | **PASS** | `POST /inventory/waste` |
| Adjustment | **PASS** | `POST /inventory/adjustment` (can set absolute level; may go negative) |
| Movement history | **PASS** | `GET /inventory/transactions` |
| Recipe mapping | **PASS** | Recipe CRUD + portion-size resolution |
| Inventory deduction | **PASS** | On order `completed` via listener |
| Low stock alerts | **WARNING** | Dashboard KPI + inventory table highlight when `stock <= reorder_level`; no push/email alert job |
| No negative stock (except adjustment) | **PASS** | `recordTransaction` blocks `out`/`waste` below zero; adjustment unrestricted |

---

## Loyalty

| Capability | Status | Notes |
|------------|--------|-------|
| Points awarded | **PASS** | `AwardLoyaltyOnOrderCompleted`; verified in lifecycle test |
| Points displayed | **PASS** | Account page progress bar |
| History displayed | **FAIL** | No customer-facing loyalty transaction history UI or public history API |
| Repeat order visible | **FAIL** | Order history links to tracking only; no "Order again" / reorder action |
| Customer account updates | **PASS** | Loyalty account created/updated on complete |

### Loyalty FAIL Details

#### FAIL — Loyalty transaction history not shown to customer

| Field | Detail |
|-------|--------|
| **Reason** | `LoyaltyTransaction` records exist server-side; account page shows balance/tier only |
| **Affected files** | `frontend/app/(customer)/account/page.tsx`, `backend/app/Modules/Loyalty/Interfaces/Controllers/CustomerLoyaltyController.php` |
| **Required fix** | Extend public loyalty endpoint with recent transactions; render list on account page |
| **Effort** | 0.5–1 day |

#### FAIL — Repeat order not available

| Field | Detail |
|-------|--------|
| **Reason** | No reorder button; order history does not repopulate cart from past items |
| **Affected files** | `frontend/app/(customer)/account/page.tsx`, `frontend/stores/cart-store.ts` |
| **Required fix** | Add "Order again" using stored order items or `GET /orders/{id}` with line items for customers |
| **Effort** | 1–2 days |

---

## WhatsApp

| Check | Status | Notes |
|-------|--------|-------|
| Customer phone stored correctly | **PASS** | CRM customer phone at checkout + preferences upsert |
| Notification job dispatched | **PASS** | `SendWhatsAppMessageJob` queued on order create/status |
| Provider abstraction works | **PASS** | Meta/Twilio via `WhatsAppProviderInterface` binding |
| Graceful failure if provider disabled | **PASS** | updateStatus guard prevents re-dispatch |
| Graceful failure if credentials absent | **PASS** | Provider throws caught in job; `failed()` logs to `activity_logs` |
| No crash if credentials absent | **PASS** | Job logs skip/fail; app continues |

**Overall: PASS** (code-path verification; no live Meta/Twilio send on this host)

---

## Push Notifications

| Check | Status | Notes |
|-------|--------|-------|
| Permission prompt | **PASS** | `NotificationOptInPrompt` requests permission |
| Subscription stored | **PASS** | `registerDeviceToken` when VAPID key present |
| Status notification | **WARNING** | Push sent on `OrderStatusUpdated` only (not on initial pending); requires VAPID + worker |
| Graceful fallback if disabled | **PASS** | Stub log when VAPID missing; subscribe uses optional `applicationServerKey` |

**Overall: WARNING** — implementation complete; live delivery not verified without VAPID env + queue worker

---

## Security

| Check | Status | Notes |
|-------|--------|-------|
| Rate limiting | **WARNING** | `throttle:login` (5/min) and `throttle:customer-orders` (10/min) applied; **`api` limiter defined but not attached to authenticated routes** |
| Tenant isolation | **PASS** | `TenantIsolationTest` — header cannot switch tenant for authenticated user |
| CORS | **PASS** | `CORS_ALLOWED_ORIGINS` env (defaults localhost:3000) |
| Authentication | **PASS** | Sanctum on staff routes; token expiry `SANCTUM_TOKEN_EXPIRATION` default 10080 min |
| Authorization | **PASS** | Permission middleware on tenant routes |
| No unrestricted admin endpoint | **PASS** | Platform routes require `platform.super_admin` |

### Security WARNING Detail

#### WARNING — General API rate limit not enforced

| Field | Detail |
|-------|--------|
| **Reason** | `RateLimiter::for('api')` in `AppServiceProvider` never applied via route middleware |
| **Affected files** | `backend/app/Providers/AppServiceProvider.php`, `backend/routes/api.php` |
| **Required fix** | Add `throttle:api` to authenticated tenant group |
| **Effort** | 0.25 day |

---

## Mobile (320–480px)

**Status: WARNING** — not manually tested in browser on this sprint; code review only.

| Check | Status | Notes |
|-------|--------|-------|
| Bottom navigation | **PASS** | `CustomerNav` fixed bottom, `max-w-lg`, safe-area padding |
| Touch targets | **PASS** | Buttons `h-11` pattern on customer components |
| Checkout | **PASS** | Responsive grid on checkout |
| Order tracking | **PASS** | Customer tracking page exists |
| Dashboard / Inventory / Menu CRUD | **PASS** | Admin pages use responsive tables/cards |
| No horizontal scrolling | **WARNING** | Not verified at 320/360/390/412/480px viewports |

---

## Database

| Check | Status | Notes |
|-------|--------|-------|
| Foreign keys | **WARNING** | Migration `2026_07_03_100000_add_foreign_keys_and_inventory_impact.php` **skips FKs on SQLite** (test DB); applies on PostgreSQL only — not executed here |
| Cascade rules | **WARNING** | Defined in migration for postgres path |
| Indexes | **PASS** | tenant_id, status, customer_id on orders; similar on core tables |
| Tenant IDs | **PASS** | Global scopes + tenant middleware |
| Soft deletes | **PASS** | Order, Meal, Customer, InventoryItem, etc. |
| No orphan records | **WARNING** | FK enforcement depends on production postgres migration run |

---

## Performance / Realtime

| Check | Status | Notes |
|-------|--------|-------|
| WebSocket reconnect | **PASS** | Exponential backoff in `lib/realtime-client.ts` |
| Polling fallback | **PASS** | `refetchInterval` on kitchen, tracking, dashboard when WS disconnected |
| No duplicate realtime events | **WARNING** | No dedup layer; debounce on dashboard analytics only |
| No duplicate notifications | **WARNING** | Each status change dispatches jobs; no idempotency keys |
| No duplicate loyalty awards | **PASS** | `updateStatus` blocks re-completing completed orders |
| No duplicate inventory deductions | **PASS** | Same completion guard |

---

## Tests & Build Pipeline

| Command | Status | Output |
|---------|--------|--------|
| `php artisan test` | **PASS** | 5 passed (CustomerOrder, TenantIsolation, OrderLifecycle, 2 examples) |
| Frontend tests | **FAIL** | No test files in frontend |
| `npx tsc --noEmit` | **PASS** | |
| `npm run lint` | **FAIL** | 4 errors: `react-hooks/set-state-in-effect` (account, ConnectionBanner, RealtimeProvider); `@next/next/no-html-link-for-pages` (login) |
| `npm run build` | **PASS** | 34 static routes after `/admin/menu` fix |
| Docker Compose | **WARNING** | `docker/docker-compose.yml` includes postgres, redis, backend, frontend, **reverb** — not runnable (Docker not installed) |
| Queue worker | **WARNING** | Not started; WhatsApp/push jobs require `queue:work` with Redis |
| Redis | **WARNING** | Not live-tested |
| Reverb | **WARNING** | Not live-tested |

### Tests FAIL Detail

#### FAIL — Frontend lint blocks CI-quality gate

| Field | Detail |
|-------|--------|
| **Reason** | ESLint errors fail `npm run lint` |
| **Affected files** | `frontend/app/(customer)/account/page.tsx`, `frontend/components/customer/ConnectionBanner.tsx`, `frontend/providers/RealtimeProvider.tsx`, `frontend/app/(auth)/login/page.tsx` |
| **Required fix** | Replace `<a href="/">` with `<Link>`; initialize state from localStorage via lazy init or suppress with documented pattern for online status |
| **Effort** | 0.5 day |

#### FAIL — No frontend automated tests

| Field | Detail |
|-------|--------|
| **Reason** | Zero `*.test.*` files in frontend |
| **Affected files** | N/A |
| **Required fix** | Add smoke tests for checkout and auth at minimum |
| **Effort** | 2–3 days |

---

## Gap Analysis Cross-Reference

Items marked fixed in `10_RELEASE_READINESS_REPORT.md` were re-verified:

| Gap | Verification result |
|-----|---------------------|
| C01 Customer orders | **PASS** — public endpoint works |
| C02 Payment | **PASS** — pilot cash/card/transfer record |
| C03 Push | **WARNING** — code fixed; live send not verified |
| C04 Customer linking | **PASS** |
| C05 Tests | **WARNING** — 3 domain tests added; still minimal |
| H01 Menu admin | **PASS** (URL image caveat) |
| H02 Inventory UI | **PASS** |
| H03 Time slots | **PASS** |
| H04 Rate limiting | **WARNING** — partial |
| H05 Tenant CRUD | **PASS** |
| H06 Foreign keys | **WARNING** — postgres-only migration |
| H07 Bottom nav | **PASS** |
| H08 Order history + loyalty | **WARNING** — history yes; loyalty history + repeat order no |
| H09 CORS | **PASS** |
| H10 Audit viewer | **PASS** (order events in separate table) |
| H11 Option CRUD | **PASS** |
| H12 Recipe portion | **PASS** (name-heuristic caveat) |

---

## Module Summary Table

| Module | Verdict |
|--------|---------|
| Customer Journey | **WARNING** |
| Staff Journey | **WARNING** |
| Super Admin | **FAIL** (branding override) |
| Menu Management | **WARNING** (image upload) |
| Inventory | **PASS** |
| Loyalty | **FAIL** (history + repeat order) |
| WhatsApp | **PASS** |
| Push | **WARNING** |
| Security | **WARNING** |
| Mobile | **WARNING** |
| Database | **WARNING** |
| Performance / Realtime | **WARNING** |
| Tests & Build | **FAIL** (lint, no frontend tests) |

---

## Recommended Pilot Go/No-Go

| Decision | Rationale |
|----------|-----------|
| **Go for controlled pilot** | Backend order lifecycle proven; owner can accept and complete orders; inventory and loyalty side effects work |
| **No-go for production CI/CD until** | Lint passes; delivery address flow clarified; kitchen pending visibility aligned with ops expectation |
| **Operator must configure** | PostgreSQL, Redis queue worker, Reverb, VAPID keys, CORS origins, WhatsApp credentials |

---

## Sign-Off

| Role | Verification assessment |
|------|-------------------------|
| QA | Core API paths **PASS**; E2E browser and infra stack **not fully executed** |
| DevOps | Docker compose valid in repo; **not run** on verification host |
| Security | Auth/tenant isolation **PASS**; API throttle incomplete |
| Product | Repeat order + delivery persistence **FAIL** against verification checklist |

**Phase 1 Pilot: CONDITIONALLY VERIFIED** — deploy with documented gaps and operator checklist from `10_RELEASE_READINESS_REPORT.md`.
