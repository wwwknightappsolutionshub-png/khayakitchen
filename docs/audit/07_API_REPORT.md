# KhayaOS Phase 1 Pilot — API Report

**Audit date:** 2026-07-03  
**Base URL:** `/api/v1` (full: `{API_HOST}/api/v1`)  
**OpenAPI:** ❌ Not implemented

---

## API Inventory

### Public — No authentication

| Method | Endpoint | Auth | Tenant | Validation | Response shape |
|--------|----------|------|--------|------------|----------------|
| POST | `/auth/login` | ❌ | Optional slug | ✅ email, password | `{ token, user }` |
| GET | `/pricing/plans` | ❌ | ❌ | — | `{ plans }` |
| GET | `/storefront` | ❌ | ✅ resolve | — | Storefront DTO |
| GET | `/realtime/public-config` | ❌ | ✅ resolve | — | WS config |

### Public — Tenant resolved (customer)

| Method | Endpoint | Auth | Tenant | Feature | Validation |
|--------|----------|------|--------|---------|------------|
| GET | `/menu` | ❌ | ✅ | menu | — |
| POST | `/customer/notifications/preferences` | ❌ | ✅ | menu* | ✅ phone, flags |
| POST | `/customer/notifications/device-token` | ❌ | ✅ | menu* | ✅ customer_id, token |
| GET | `/realtime/order-status/{id}` | ❌ | ✅ | menu* | UUID id |

*Note: Notification endpoints gated by `feature:menu` middleware group — likely unintentional; should be `feature:notifications` or ungated.

### Authenticated — Tenant staff

**Middleware:** `auth:sanctum`, `tenant.resolve`, `tenant.access`, `permissions.load`

#### Auth
| Method | Endpoint | Feature | RBAC | Validation |
|--------|----------|---------|------|------------|
| POST | `/auth/logout` | — | — | — |
| GET | `/auth/me` | — | — | — |

#### Menu
| Method | Endpoint | Feature | RBAC | Validation |
|--------|----------|---------|------|------------|
| POST | `/menu/meals` | menu | menu.manage | ✅ name, prices |
| PUT | `/menu/meals/{id}` | menu | menu.manage | ✅ partial fields |
| GET | `/menu` | — | — | Public route separate |

**Missing CRUD:** `DELETE /menu/meals/{id}`, `GET /menu/meals/{id}`, option group/option endpoints

#### Orders
| Method | Endpoint | Feature | RBAC | Validation |
|--------|----------|---------|------|------------|
| GET | `/orders` | orders | orders.view | query status |
| POST | `/orders` | orders | orders.create | ✅ items array |
| PATCH | `/orders/{id}/status` | orders | orders.update* | ✅ status enum |
| POST | `/orders/{id}/cancel` | orders | orders.update* | — |

**Missing:** `GET /orders/{id}`, **public `POST /orders` for customers**

#### Inventory
| Method | Endpoint | Feature | RBAC | Validation |
|--------|----------|---------|------|------------|
| GET | `/inventory` | inventory | inventory.manage | — |
| POST | `/inventory/stock-in` | inventory | inventory.adjust | ✅ item_id, qty |
| POST | `/inventory/consume` | inventory | inventory.manage | ✅ order_id or item |
| POST | `/inventory/waste` | inventory | inventory.adjust | ✅ item_id, qty |
| GET | `/recipes` | inventory | inventory.manage | query meal_id |
| POST | `/recipes` | inventory | inventory.manage | ✅ components |

**Missing:** `POST /inventory/adjustment`, `GET /inventory/transactions`, item CRUD

#### CRM
| Method | Endpoint | Feature | RBAC |
|--------|----------|---------|------|
| GET | `/customers` | crm | crm.view |
| GET | `/customers/insights` | crm | crm.view |
| GET | `/customers/{id}` | crm | crm.view |
| POST | `/customers/{id}/tags` | crm | crm.manage |

**Missing:** `POST /customers` (create), tag CRUD

#### Loyalty
| Method | Endpoint | Feature | RBAC |
|--------|----------|---------|------|
| GET | `/loyalty/{customer_id}` | loyalty | loyalty.manage |
| POST | `/loyalty/earn` | loyalty | loyalty.manage |
| POST | `/loyalty/redeem` | loyalty | loyalty.manage |

**Issue:** earn/redeem should be internal-only per API bible §10.2

#### Dashboard
| Method | Endpoint | Feature | RBAC |
|--------|----------|---------|------|
| GET | `/dashboard/kpis` | dashboard | dashboard.view |
| GET | `/dashboard/sales-trends` | dashboard | dashboard.view |
| GET | `/dashboard/inventory-health` | dashboard | dashboard.view |

#### Kitchen
| Method | Endpoint | Feature | RBAC |
|--------|----------|---------|------|
| GET | `/kitchen/orders` | kitchen | kitchen.view |
| PATCH | `/kitchen/orders/{id}` | kitchen | kitchen.view + status |

#### Delivery
| Method | Endpoint | Feature | RBAC |
|--------|----------|---------|------|
| POST | `/delivery` | delivery | delivery.manage |
| PATCH | `/delivery/{id}/status` | delivery | delivery.manage |

**Missing:** delivery zones CRUD, `GET /delivery`

#### Notifications
| Method | Endpoint | Feature | RBAC |
|--------|----------|---------|------|
| GET | `/notifications` | notifications | notifications.view |
| PATCH | `/notifications/{id}/read` | notifications | notifications.view |
| GET | `/campaigns` | notifications | campaigns.view |
| POST | `/campaigns` | notifications | campaigns.manage |
| POST | `/campaigns/{id}/send` | notifications | campaigns.manage |

#### Tenant config
| Method | Endpoint | Feature | RBAC |
|--------|----------|---------|------|
| GET | `/feature-flags` | — | — |
| PATCH | `/feature-flags` | — | owner/super_admin |
| GET | `/entitlements` | — | — |
| GET | `/branding` | — | branding.view |
| PATCH | `/branding` | — | branding.manage |
| GET | `/restaurant-status` | — | — |
| PATCH | `/restaurant-status` | — | owner-level |

#### Realtime (auth)
| Method | Endpoint | Notes |
|--------|----------|-------|
| GET | `/realtime/config` | Private WS auth |
| GET | `/realtime/orders` | Polling fallback |
| GET | `/realtime/dashboard-summary` | Dashboard poll |
| GET | `/realtime/order-status/{id}` | Duplicate of public route |

### Platform — Super admin

**Middleware:** `auth:sanctum`, `platform.super_admin`

| Method | Endpoint | CRUD |
|--------|----------|------|
| GET | `/platform/dashboard` | Read |
| GET | `/platform/modules` | Read |
| GET | `/platform/tenants` | **Read only** |
| PATCH | `/platform/tenants/{tenantId}/restaurant-status` | Update |
| GET | `/platform/feature-flags` | Read |
| PATCH | `/platform/feature-flags/{tenantId}` | Update |
| GET/POST/PUT/DELETE | `/platform/pricing/plans/*` | Full (plans) |
| GET/POST/PUT | `/platform/pricing/features/*` | Partial (no delete) |
| GET/POST/PATCH | `/platform/pricing/subscriptions/*` | Assign/status |
| POST | `/platform/pricing/override` | Override |

**Missing:** Tenant CRUD, audit log read, feature DELETE

### Broadcast
| Method | Endpoint | Auth |
|--------|----------|------|
| POST | `/api/broadcasting/auth` | sanctum + tenant |

---

## Authentication Matrix Summary

| Endpoint group | Auth required |
|----------------|---------------|
| Login, pricing, storefront | No |
| Customer menu, notifications | No |
| All staff operations | Yes (Sanctum) |
| Customer orders | **Yes — BUG** |
| Platform | Yes (super_admin) |

---

## Authorization Matrix Summary

| Layer | Mechanism |
|-------|-----------|
| Role permissions | `PermissionService` in services |
| Feature modules | `feature:{module}` middleware |
| Plan entitlements | `FeatureAccessService` |
| Platform | `EnsureSuperAdmin` |

**Gap:** No unified policy layer; inconsistent feature gate on customer notification routes.

---

## Tenant Scope Verification

| Check | Result |
|-------|--------|
| Header `X-Tenant-ID` | ✅ Supported |
| Header `X-Tenant-Slug` | ✅ Supported |
| Token `tenant_id` | ✅ Supported |
| Cross-tenant data access | ✅ Blocked by scope + middleware |
| Super admin on tenant routes | ✅ Blocked |

---

## Validation Quality

**Verified:** All controllers use `$request->validate()` or Form Request patterns with typed rules.

**Gaps:**
- Order creation does not validate meal belongs to tenant (relies on global scope findOrFail — OK)
- No validation that option belongs to meal on order create
- `scheduled_time` not validated against business hours/slots

---

## Response DTO Consistency

**Pattern:** `ApiResponse::success()` / `ApiResponse::error()` wrapper.

**Standard error format (Bible §16):**
```json
{ "error": true, "message": "...", "code": "ERROR_CODE", "details": {} }
```
✅ Implemented in `App\Shared\Utils\ApiResponse`

**Gaps:**
- No API Resources — models returned as arrays/json directly
- Inconsistent key naming (`order_id` vs `id` in responses)

---

## OpenAPI Compatibility

**Status:** ❌ Not implemented

- No `openapi.yaml` / Swagger UI
- No generated client SDK
- API spec exists only in `docs/05-api-specification.md` (markdown)

---

## Missing CRUD Endpoints (vs Bible / Pilot needs)

| Resource | Create | Read | Update | Delete |
|----------|--------|------|--------|--------|
| Tenants (platform) | ❌ | ✅ | ❌ | ❌ |
| Meals | ✅ | ❌ | ✅ | ❌ |
| Option groups | ❌ | ❌ | ❌ | ❌ |
| Meal options | ❌ | ❌ | ❌ | ❌ |
| Inventory items | ❌ | ✅ | ❌ | ❌ |
| Inventory transactions | ✅ | ❌ | — | — |
| Payments | ❌ | ❌ | ❌ | ❌ |
| Delivery zones | ❌ | ❌ | ❌ | ❌ |
| Users (staff) | ❌ | ❌ | ❌ | ❌ |
| Audit logs | — | ❌ | — | — |
| Customer orders (public) | ❌* | ❌ | — | — |

*POST exists but requires staff auth

---

## Event Triggers (Bible §18)

| Endpoint | Event | Verified |
|----------|-------|----------|
| POST /orders | OrderCreated | ✅ |
| PATCH /orders/status | OrderStatusUpdated | ✅ |
| Status → completed | OrderCompleted | ✅ |
| POST /inventory/consume | InventoryUpdated | ✅ |
| POST /loyalty/earn | LoyaltyUpdated | ✅ (via service) |

---

## API Health

| Check | Endpoint |
|-------|----------|
| Laravel health | `GET /up` |

---

## Recommendations

1. Add `POST /customer/orders` (public, rate-limited) or move order create to public middleware group  
2. Add `GET /orders/{id}` with scoped access  
3. Complete menu nested CRUD for options  
4. Add inventory adjustment + transaction history endpoints  
5. Add payment record endpoint  
6. Fix notification routes feature middleware  
7. Generate OpenAPI from routes or maintain `openapi.yaml`  
8. Add audit log `GET` endpoints (paginated)  

**Total endpoints implemented:** ~70  
**Pilot-blocking API gaps:** 3 (guest orders, payments, menu option CRUD)
