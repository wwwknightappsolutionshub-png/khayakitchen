# Live Dashboard alerts + menu guest chat — Implementation / QA

**Date:** 2026-07-13  
**Scope:** Items 1–4 against existing Live Dashboard + engagement chat

## Delivered

1. **New order alert** — red badge + Pending KPI ring; alarm tone + `navigator.vibrate` on newly seen `pending` orders; mute/clear controls (`useNewOrderAlerts`).
2. **Top Selling + Live Orders** — side-by-side `lg:grid-cols-2`; Top Selling rank color grades (#1–#3) with quantity bars.
3. **Insight** — graphical meal volume bars via `InsightChart` using existing `mealPopularity` + insight sentence.
4. **Menu chat icon** — floating chat FAB opens modal wired to tenant↔customer chat; **guests** supported via `guest_key` (additive API; phone still optional).

## Backend

- `ChatService` + `CustomerEngagementController`: `phone` optional; `guest_key` optional; one required.
- Guest identity stored as deterministic CRM phone `g-{sha256…}` (32 chars).
- Feature gate unchanged: `tenant_customer_chat`.

## Tests / build

- `php artisan test --filter=EngagementFeaturesTest` (includes guest chat)
- Full suite + `npm run build` required before release
