# KhayaOS Phase 1 Pilot — Roadmap Status

**Audit date:** 2026-07-03

| Module | Status | Production Readiness | Notes |
|--------|--------|-------------------|-------|
| **Architecture** | Partial | Needs Improvement | Modular monolith in place; missing `infrastructure/`, OpenAPI |
| **Authentication** | Partial | Incomplete | Staff login works; no customer auth/guest orders |
| **Authorization (RBAC)** | Partial | Needs Improvement | Static permissions; service-layer enforcement |
| **Tenant Isolation** | Complete | Production Ready | Middleware + global scopes verified |
| **Menu (customer)** | Complete | Production Ready | Browse + customise flow works |
| **Menu (admin)** | Missing | Missing | No UI; API partial (meals only) |
| **Add-ons / Options** | Partial | Incomplete | Customer selection works; no admin CRUD |
| **Orders (staff)** | Complete | Production Ready | List, status update, cancel |
| **Orders (customer)** | Missing | Missing | Blocked by auth requirement |
| **Payments** | Missing | Missing | Table only |
| **Kitchen Display** | Partial | Needs Improvement | Works; missing prep-time grouping |
| **Inventory Engine** | Partial | Incomplete | Auto-deduct on complete; no admin ops UI |
| **Recipe Engine** | Partial | Needs Improvement | Basic recipes; portion mapping incomplete |
| **CRM** | Partial | Needs Improvement | Backend + list UI; weak customer linking |
| **Loyalty** | Partial | Incomplete | Auto-earn backend; no customer UI |
| **Dashboard** | Partial | Needs Improvement | KPIs + live feed; sufficient for pilot with data |
| **Reports** | Partial | Needs Improvement | Basic sales bars + inventory health |
| **Notifications (in-app)** | Partial | Needs Improvement | API only for admin |
| **WhatsApp** | Partial | Incomplete | Pipeline exists; needs provider config + customer link |
| **Push Notifications** | Missing | Missing | VAPID/provider not wired |
| **Campaigns / Marketing** | Partial | Needs Improvement | Create/send UI exists |
| **Delivery** | Partial | Incomplete | API exists; no zones UI; checkout basic address only |
| **Pickup / Scheduling** | Partial | Incomplete | API field exists; no UI |
| **Branding** | Complete | Production Ready | Full admin + storefront integration |
| **Restaurant Status** | Complete | Production Ready | Open/closed/promo with checkout guard |
| **Realtime / WebSocket** | Partial | Needs Improvement | Reverb + Pusher + polling fallback |
| **Pricing / Plans** | Partial | Needs Improvement | SaaS layer built; pilot uses seeded Growth plan |
| **Subscriptions** | Partial | Needs Improvement | Platform assign works |
| **Feature Flags** | Partial | Needs Improvement | Dual system (flags + plan features) |
| **Super Admin Console** | Partial | Incomplete | List tenants; no tenant CRUD; no audit viewer |
| **Tenant Admin Console** | Partial | Incomplete | Ops screens exist; menu/inventory management missing |
| **PWA** | Partial | Needs Improvement | SW + manifest; weak offline + icons |
| **Mobile UX (customer)** | Partial | Needs Improvement | Good components; bottom nav not mounted |
| **Mobile UX (admin/kitchen)** | Partial | Needs Improvement | Kitchen tap targets good; no lazy load |
| **Android Optimization** | Missing | Missing | No bundle splitting, virtualization, battery opts |
| **Offline Experience** | Partial | Incomplete | Offline page + cart persist; no menu API cache |
| **Accessibility** | Partial | Needs Improvement | Partial ARIA; zoom disabled |
| **Audit Logging** | Partial | Incomplete | Write-only |
| **Security Hardening** | Partial | Incomplete | No rate limits; permissive CORS |
| **Deployment** | Partial | Needs Improvement | Docker compose dev only |
| **Automated Tests** | Missing | Missing | Scaffold only |
| **Accounting** | Scaffolded | N/A Phase 2 | `coming-soon` in platform modules |
| **Forecasting** | Scaffolded | N/A Phase 2 | `coming-soon` |
| **Multi-branch** | Scaffolded | N/A Phase 2 | Not in scope |
| **Supplier Portal** | Scaffolded | N/A Phase 2 | Not in scope |

---

## Phase 1 Pilot Scope (from Product Bible §9)

| Required for Pilot | Implementation Status |
|--------------------|----------------------|
| Menu configuration | ❌ Admin UI missing |
| Orders | ❌ Customer orders blocked |
| Kitchen display | 🟡 Functional with gaps |
| Inventory tracking | 🟡 Backend only |
| CRM | 🟡 Partial |
| Loyalty | 🟡 Backend only |
| Dashboard | 🟡 Functional |
| Notifications | 🟡 Partial |
| Basic delivery + pickup | 🟡 Partial |

**Pilot readiness score:** ~45% of required capabilities are end-to-end functional.

---

## Recommended Fix Sequence (post-audit)

1. **Week 1 — Unblock core loop:** Guest order API, customer linking, checkout scheduling, mount bottom nav, rate limiting
2. **Week 2 — Owner operations:** Menu admin UI, inventory ops UI, adjustment API, smoke tests
3. **Week 3 — Notifications + hardening:** Push/VAPID, WhatsApp config, CORS, token expiry, audit log read
4. **Week 4 — Android + pilot polish:** Lazy routes, offline menu cache, virtualization, icons, docker reverb

*Phase 2 features (accounting, forecasting, multi-branch) must not start until Critical + High pilot gaps are closed.*
