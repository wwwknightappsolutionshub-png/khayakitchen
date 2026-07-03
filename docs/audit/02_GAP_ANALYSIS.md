# KhayaOS Phase 1 Pilot — Gap Analysis

**Audit date:** 2026-07-03  
All gaps below are verified against the codebase. Nothing is assumed complete.

---

## Critical

### GAP-C01: Customer cannot place orders (auth wall)

| Field | Detail |
|-------|--------|
| **Description** | `POST /api/v1/orders` is behind `auth:sanctum`. Customer PWA checkout calls this without a token. |
| **Reason** | Order routes grouped with staff-authenticated tenant routes in `backend/routes/api.php`. No public/guest order endpoint. |
| **Business impact** | **Pilot cannot accept customer orders.** Core product flow is broken. |
| **Suggested fix** | Add `POST /orders` (or `/customer/orders`) to public tenant middleware group; resolve/create customer from phone/name; use rate limiting + CAPTCHA. Wire checkout to pass `customer_id`. |
| **Effort** | 2–3 days |

### GAP-C02: No payment integration

| Field | Detail |
|-------|--------|
| **Description** | Product bible flow includes Payment step. `payments` table exists; no API, service, or checkout payment UI. |
| **Reason** | Payment module not implemented beyond migration. |
| **Business impact** | Orders have no payment status; revenue tracking is order-total only; cannot reconcile cash vs digital. |
| **Suggested fix** | Minimum pilot: record payment method + status on order creation (cash/card/transfer); optional Paystack/Flutterwave stub. |
| **Effort** | 3–5 days (full gateway); 1 day (manual status) |

### GAP-C03: Push notifications non-functional

| Field | Detail |
|-------|--------|
| **Description** | `applicationServerKey: undefined` in `NotificationOptInPrompt.tsx`. Backend `PushNotificationService` is stub-only. |
| **Reason** | VAPID keys and Web Push provider not configured. |
| **Business impact** | Customers miss order-ready alerts; retention feature absent. |
| **Suggested fix** | Add VAPID key generation, env vars, wire subscription key; integrate web-push library on backend; send on order status events. |
| **Effort** | 2–3 days |

### GAP-C04: Customer not linked to orders at checkout

| Field | Detail |
|-------|--------|
| **Description** | Checkout collects name/phone and may create notification preferences, but `placeOrder` payload omits `customer_id`. Orders created with `customer_id: null`. |
| **Reason** | `frontend/app/(customer)/checkout/page.tsx` does not read `khayaos-customer-id` or create customer before order. |
| **Business impact** | CRM, loyalty, and WhatsApp side effects skipped for most orders. |
| **Suggested fix** | Upsert customer at checkout; pass `customer_id` in order payload. |
| **Effort** | 0.5–1 day |

### GAP-C05: Zero domain test coverage

| Field | Detail |
|-------|--------|
| **Description** | No tests for auth, tenancy, orders, inventory consumption, or feature gating. |
| **Reason** | Only Laravel example tests exist. |
| **Business impact** | Regressions undetected; unsafe for daily restaurant operations. |
| **Suggested fix** | Feature tests for: tenant isolation, order lifecycle, inventory deduction, public menu, guest order (once added). |
| **Effort** | 3–5 days |

---

## High

### GAP-H01: No menu management UI for tenant owner

| Field | Detail |
|-------|--------|
| **Description** | Backend supports meal create/update; frontend `menu.service.ts` only has `getMenu()`. No admin menu page. |
| **Reason** | Admin UI not built for menu CRUD. |
| **Business impact** | Owner must use API/DB to change menu — not viable for pilot. |
| **Suggested fix** | Admin `/menu` page with meal list, create/edit forms; call existing APIs. |
| **Effort** | 2–3 days |

### GAP-H02: Inventory admin is read-only

| Field | Detail |
|-------|--------|
| **Description** | Stock-in, waste, adjustment APIs exist (partial); no UI for any write operation or movement history. |
| **Reason** | `inventory/page.tsx` is display-only table. |
| **Business impact** | Owner cannot manage stock without API access; inventory accuracy goal at risk. |
| **Suggested fix** | Add stock-in/waste/adjustment forms; transaction history table; wire to APIs. Add `POST /inventory/adjustment`. |
| **Effort** | 2–4 days |

### GAP-H03: No scheduled time / time slot selection

| Field | Detail |
|-------|--------|
| **Description** | Bible requires pre-order scheduling. API accepts `scheduled_time`; checkout UI does not collect it. |
| **Reason** | Checkout form schema omits scheduling. |
| **Business impact** | Pickup/delivery time slots unusable; kitchen cannot plan ahead. |
| **Suggested fix** | Time slot picker component; tenant-configurable slots; pass `scheduled_time` to API. |
| **Effort** | 2 days |

### GAP-H04: No API rate limiting

| Field | Detail |
|-------|--------|
| **Description** | No `throttle` middleware on any API route including login. |
| **Reason** | Not implemented. |
| **Business impact** | Brute-force login, order spam, DoS vulnerability on pilot deployment. |
| **Suggested fix** | `RateLimiter` on `auth/login` (5/min), public order (10/min/IP), general API (60/min). |
| **Effort** | 0.5–1 day |

### GAP-H05: Super admin cannot create tenants

| Field | Detail |
|-------|--------|
| **Description** | `GET /platform/tenants` only. No POST/PUT/DELETE. |
| **Reason** | `PlatformTenantService` is list-only. |
| **Business impact** | Cannot onboard new restaurants without DB/seeder. |
| **Suggested fix** | Tenant CRUD APIs + platform UI form. |
| **Effort** | 2 days |

### GAP-H06: No foreign key constraints in database

| Field | Detail |
|-------|--------|
| **Description** | All migrations use indexes but zero `foreign()` / `constrained()` definitions. |
| **Reason** | Schema design choice or incomplete migration hardening. |
| **Business impact** | Orphan rows, referential integrity failures, harder audits. |
| **Suggested fix** | Add FK migration with cascade rules for tenant-scoped tables. |
| **Effort** | 1–2 days |

### GAP-H07: Customer bottom navigation not mounted

| Field | Detail |
|-------|--------|
| **Description** | `CustomerNav.tsx` built with thumb-friendly bottom nav but **zero imports** in app. |
| **Reason** | Incomplete integration; header nav used instead. |
| **Business impact** | Worse one-handed mobile UX on primary customer device (Android). |
| **Suggested fix** | Mount `CustomerNav` in `CustomerLayoutShell`; adjust padding. |
| **Effort** | 0.5 day |

### GAP-H08: No customer order history or loyalty UI

| Field | Detail |
|-------|--------|
| **Description** | Account page shows only `activeOrderId` from cart store. No loyalty progress bar. |
| **Reason** | Customer account not built out. |
| **Business impact** | Repeat ordering friction; loyalty program invisible to customers. |
| **Suggested fix** | Order history by customer_id/phone; loyalty progress component on account. |
| **Effort** | 2 days |

### GAP-H09: CORS allows all origins

| Field | Detail |
|-------|--------|
| **Description** | `config/cors.php` → `allowed_origins: ['*']`. |
| **Reason** | Default permissive dev config. |
| **Business impact** | Any origin can call public APIs from browser (combined with no rate limits = risk). |
| **Suggested fix** | Restrict to frontend domain(s) in production env. |
| **Effort** | 0.5 day |

### GAP-H10: No audit log read API / UI

| Field | Detail |
|-------|--------|
| **Description** | `audit_logs` written but never exposed. |
| **Reason** | Write-only audit implementation. |
| **Business impact** | Owner/platform cannot investigate changes or disputes. |
| **Suggested fix** | `GET /audit-logs` (platform + owner scoped) + paginated UI. |
| **Effort** | 1–2 days |

### GAP-H11: Option groups / add-ons not manageable via API or UI

| Field | Detail |
|-------|--------|
| **Description** | No endpoints for option group or meal option CRUD. Meals created without options. |
| **Reason** | Menu module only exposes meal-level create/update. |
| **Business impact** | Cannot configure meal customisation without DB seeds. |
| **Suggested fix** | Nested menu APIs or separate option endpoints + admin UI. |
| **Effort** | 2–3 days |

### GAP-H12: Recipe engine ignores portion size at consumption

| Field | Detail |
|-------|--------|
| **Description** | `consumeForOrder` uses `RecipeDefinition::where('meal_id', ...)->first()` — no portion/option mapping. |
| **Reason** | Recipe selection logic incomplete. |
| **Business impact** | Inventory deductions inaccurate for size variants. |
| **Suggested fix** | Map order item options to `portion_size` or recipe variant. |
| **Effort** | 1–2 days |

---

## Medium

### GAP-M01: No lazy loading of admin/heavy routes

| Field | Detail |
|-------|--------|
| **Description** | No `next/dynamic` for admin, reports, inventory, analytics, campaigns. |
| **Business impact** | Larger initial JS on low-end Android devices. |
| **Suggested fix** | Dynamic import admin route segments. |
| **Effort** | 1 day |

### GAP-M02: Offline menu data not cached

| Field | Detail |
|-------|--------|
| **Description** | SW caches `/menu` HTML only; API JSON not cached; no offline banner on customer app. |
| **Business impact** | Menu unavailable offline despite PWA positioning. |
| **Suggested fix** | Cache `GET /menu` in IndexedDB; offline indicator component. |
| **Effort** | 1–2 days |

### GAP-M03: No request retry queue

| Field | Detail |
|-------|--------|
| **Description** | Failed API calls not queued for retry when connection returns. |
| **Business impact** | Orders lost on flaky mobile networks. |
| **Suggested fix** | Offline queue in service worker or api-client for POST orders. |
| **Effort** | 2 days |

### GAP-M04: WhatsApp delivery stub

| Field | Detail |
|-------|--------|
| **Description** | Provider sends only when configured; otherwise skipped/logged. |
| **Business impact** | WhatsApp notifications don't reach customers in pilot without manual config. |
| **Suggested fix** | Document + configure Meta/Twilio; add health check endpoint. |
| **Effort** | 1–2 days |

### GAP-M05: Sanctum tokens never expire

| Field | Detail |
|-------|--------|
| **Description** | `sanctum.php` expiration null. |
| **Business impact** | Stolen staff tokens valid indefinitely. |
| **Suggested fix** | Set expiration (e.g. 7 days) + refresh or re-login. |
| **Effort** | 0.5 day |

### GAP-M06: No delivery zone management

| Field | Detail |
|-------|--------|
| **Description** | `delivery_zones` table exists; no CRUD API or UI. Delivery fee not calculated at checkout. |
| **Business impact** | Delivery pricing manual/incorrect. |
| **Suggested fix** | Zone CRUD + fee calculation in checkout. |
| **Effort** | 2 days |

### GAP-M07: Kitchen display missing prep-time grouping

| Field | Detail |
|-------|--------|
| **Description** | Kitchen lists orders flat; no grouping by `scheduled_time`. |
| **Business impact** | Kitchen efficiency below bible target under load. |
| **Suggested fix** | Group/sort by scheduled_time; highlight overdue. |
| **Effort** | 1 day |

### GAP-M08: No virtualized long order lists

| Field | Detail |
|-------|--------|
| **Description** | Admin orders table renders all rows. |
| **Business impact** | Performance degradation on busy days / low-end devices. |
| **Suggested fix** | `@tanstack/react-virtual` on orders feed. |
| **Effort** | 1 day |

### GAP-M09: PWA icon / splash incomplete

| Field | Detail |
|-------|--------|
| **Description** | Single SVG icon; no 192/512 PNG maskable icons; no splash screens. |
| **Business impact** | Poor install experience on Android. |
| **Suggested fix** | Generate icon set; update manifest. |
| **Effort** | 0.5 day |

### GAP-M10: `inventory_impact` on meal options not in schema

| Field | Detail |
|-------|--------|
| **Description** | Database bible specifies JSONB `inventory_impact` on meal_options; migration lacks column. |
| **Business impact** | Option-level inventory effects impossible. |
| **Suggested fix** | Migration + consumption logic update. |
| **Effort** | 1–2 days |

### GAP-M11: No staff/user management for tenant

| Field | Detail |
|-------|--------|
| **Description** | Cannot add kitchen/manager users from admin UI. |
| **Business impact** | Owner depends on seeder/DB for staff accounts. |
| **Suggested fix** | User CRUD API + settings UI. |
| **Effort** | 2 days |

### GAP-M12: Reverb not in docker-compose

| Field | Detail |
|-------|--------|
| **Description** | Realtime requires separate `reverb:start`; not in compose stack. |
| **Business impact** | Realtime broken in default Docker deployment. |
| **Suggested fix** | Add reverb service to `docker-compose.yml`. |
| **Effort** | 0.5 day |

---

## Low

### GAP-L01: `CustomerNav` dead code (duplicate of intended nav)

| **Effort** | 0.5 day (mount or delete) |

### GAP-L02: `UserFactory` references wrong model namespace

| **Effort** | 0.25 day |

### GAP-L03: `maximumScale: 1` in viewport hurts low-vision users

| **Effort** | 0.25 day |

### GAP-L04: No `prefers-reduced-motion` support

| **Effort** | 0.5 day |

### GAP-L05: No OpenAPI specification

| **Effort** | 2 days |

### GAP-L06: No CI/CD pipeline

| **Effort** | 1–2 days |

### GAP-L07: Demo seeder uses known passwords

| **Effort** | 0.25 day (document + env-gated) |

### GAP-L08: Feature flag PATCH allowed for owner (spec says super admin)

| **Effort** | 0.5 day (clarify spec vs intentional) |

### GAP-L09: No `GET /orders/{id}` endpoint

| **Effort** | 0.5 day |

### GAP-L10: Analytics client-side aggregation in `analytics.service.ts`

| **Effort** | 1 day (move to backend) |

---

## Priority Summary

| Priority | Count | Must fix before pilot? |
|----------|-------|------------------------|
| Critical | 5 | **Yes** |
| High | 12 | **Yes** (most) |
| Medium | 12 | Recommended |
| Low | 10 | Post-pilot acceptable |

**Minimum viable pilot fix set:** GAP-C01, C04, H01, H02, H03, H04, H07, H08 + smoke tests (C05 subset).
