# KhayaOS Phase 1 Pilot — Database Report

**Audit date:** 2026-07-03  
**Migrations reviewed:** 41 files in `backend/database/migrations/`

---

## Migration Inventory

| # | Migration | Table(s) |
|---|-----------|----------|
| 1 | `0001_01_01_000000_create_users_table` | password_reset_tokens, sessions |
| 2 | `0001_01_01_000001_create_cache_table` | cache, cache_locks |
| 3 | `0001_01_01_000002_create_jobs_table` | jobs, job_batches, failed_jobs |
| 4 | `2026_07_03_000001_create_tenants_table` | tenants |
| 5 | `2026_07_03_000002_create_users_table` | users |
| 6 | `2026_07_03_000003_create_customers_table` | customers |
| 7 | `2026_07_03_000004_create_feature_flags_table` | feature_flags |
| 8 | `2026_07_03_000005_create_meals_table` | meals |
| 9 | `2026_07_03_000006_create_option_groups_table` | option_groups |
| 10 | `2026_07_03_000007_create_meal_options_table` | meal_options |
| 11 | `2026_07_03_000008_create_orders_table` | orders |
| 12 | `2026_07_03_000009_create_order_items_table` | order_items |
| 13 | `2026_07_03_000010_create_order_item_options_table` | order_item_options |
| 14 | `2026_07_03_000011_create_inventory_items_table` | inventory_items |
| 15 | `2026_07_03_000012_create_inventory_transactions_table` | inventory_transactions |
| 16 | `2026_07_03_000013_create_recipe_definitions_table` | recipe_definitions |
| 17 | `2026_07_03_000014_create_recipe_components_table` | recipe_components |
| 18 | `2026_07_03_000015_create_crm_profiles_table` | crm_profiles |
| 19 | `2026_07_03_000016_create_crm_tags_table` | crm_tags |
| 20 | `2026_07_03_000017_create_crm_tag_assignments_table` | crm_tag_assignments |
| 21 | `2026_07_03_000018_create_loyalty_accounts_table` | loyalty_accounts |
| 22 | `2026_07_03_000019_create_loyalty_transactions_table` | loyalty_transactions |
| 23 | `2026_07_03_000020_create_payments_table` | payments |
| 24 | `2026_07_03_000021_create_delivery_zones_table` | delivery_zones |
| 25 | `2026_07_03_000022_create_delivery_orders_table` | delivery_orders |
| 26 | `2026_07_03_000023_create_notifications_table` | notifications |
| 27 | `2026_07_03_000024_create_activity_logs_table` | activity_logs |
| 28 | `2026_07_03_000025_create_domain_event_logs_table` | domain_event_logs |
| 29 | `2026_07_03_021125_create_personal_access_tokens_table` | personal_access_tokens |
| 30 | `2026_07_03_000026_create_platform_modules_table` | platform_modules |
| 31 | `2026_07_03_000027_create_notification_campaigns_table` | notification_campaigns |
| 32 | `2026_07_03_000028_create_customer_notification_preferences_table` | customer_notification_preferences |
| 33 | `2026_07_03_000029_create_device_tokens_table` | device_tokens |
| 34 | `2026_07_03_000030_add_crm_profile_enhancements_table` | alters crm_profiles |
| 35 | `2026_07_03_000031_create_plans_table` | plans |
| 36 | `2026_07_03_000032_create_features_table` | features |
| 37 | `2026_07_03_000033_create_plan_features_table` | plan_features |
| 38 | `2026_07_03_000034_create_tenant_subscriptions_table` | tenant_subscriptions |
| 39 | `2026_07_03_000035_create_audit_logs_table` | audit_logs |
| 40 | `2026_07_03_000036_create_tenant_brandings_table` | tenant_brandings |
| 41 | `2026_07_03_000037_create_restaurant_statuses_table` | restaurant_statuses |

**Duplicate tables:** None detected.  
**Note:** Two migrations touch "users" concept — Laravel infra vs KhayaOS `users` table (different files).

---

## tenant_id Enforcement

| Rule (Bible) | Status |
|--------------|--------|
| Every business table has `tenant_id` | ✅ All domain tables include `tenant_id` |
| `tenant_id NOT NULL` | ✅ On domain tables |
| Exception: `users.tenant_id` nullable | ✅ For super_admin |
| Exception: `audit_logs.tenant_id` nullable | ✅ Platform-level audits |
| Application global scope | ✅ `HasTenant` trait |

**Tables without tenant_id (expected):** `plans`, `features`, `plan_features` (platform catalog), Laravel infra tables.

---

## Foreign Keys

| Status | Finding |
|--------|---------|
| ❌ | **Zero `foreign()` / `constrained()` definitions** across all migrations |

**Impact:**
- Orphan `order_items` if order deleted
- No cascade rules
- Referential integrity enforced only in application code

**Recommended cascades:**
- `order_items.order_id` → `orders.id` ON DELETE CASCADE
- `order_item_options.order_item_id` → `order_items.id` ON DELETE CASCADE
- `option_groups.meal_id` → `meals.id` ON DELETE CASCADE
- `meal_options.option_group_id` → `option_groups.id` ON DELETE CASCADE
- `inventory_transactions.inventory_item_id` → `inventory_items.id` RESTRICT
- `tenant_id` → `tenants.id` RESTRICT on all tenant tables

---

## Indexes

### Present (verified via migration grep)

| Table | Indexed columns |
|-------|-----------------|
| All tenant tables | `tenant_id` |
| orders | `status`, `created_at`, `customer_id` |
| order_items | `order_id`, `meal_id` |
| inventory_transactions | `inventory_item_id` |
| meals | `tenant_id` only |
| loyalty_accounts | unique `(tenant_id, customer_id)` |
| device_tokens | unique `(tenant_id, device_token)` |

### Missing (per Bible §14)

| Table.Column | Bible requires | Status |
|--------------|----------------|--------|
| meals.meal_id | N/A | — |
| order_items | meal_id indexed | ✅ |
| option_groups | meal_id indexed | ✅ |
| meals | missing composite `(tenant_id, is_active)` | 🟡 Optional perf index |
| crm_profiles | favorite_meal_id | ❌ Not indexed |
| payments.status | — | ❌ Not indexed |
| notifications.is_read | — | ❌ Not indexed |

---

## Soft Deletes

| Table | softDeletes() | Bible requires |
|-------|---------------|----------------|
| orders | ✅ | ✅ |
| customers | ✅ | ✅ |
| meals | ✅ | — |
| inventory_items | ✅ | ✅ |
| inventory_transactions | ✅ | ✅ |
| payments | ✅ | ✅ |
| loyalty_transactions | ✅ | — |
| users | ❌ | Should per bible critical entities |
| option_groups | ❌ | — |
| meal_options | ❌ | — |
| order_items | ❌ | Immutable line items — OK |

---

## Timestamps & Audit Columns

| Pattern | Status |
|---------|--------|
| `created_at` / `updated_at` | ✅ Most tables |
| `created_by` / `updated_by` | ✅ orders, meals, inventory_items, customers, users |
| recipe_definitions | Only `created_at` | 🟡 Missing `updated_at` |
| inventory_transactions | `created_at` via manual insert; has `created_by` | 🟡 No `updated_at` |
| activity_logs | `created_at` only | ✅ Append-only |

---

## Constraints & Nullable Fields

| Field | Current | Should be |
|-------|---------|-----------|
| `orders.customer_id` | nullable | nullable OK for guest until linked |
| `orders.total_amount` | default 0 | NOT NULL ✅ |
| `users.tenant_id` | nullable | OK for super_admin |
| `meal_options.price_delta` | present | OK |
| `inventory_items.current_stock` | default 0 | OK; app prevents negative |

### Schema vs Bible drift

| Bible column | Status |
|--------------|--------|
| `meal_options.inventory_impact` JSONB | ❌ **Missing from migration** |
| `loyalty_accounts.tier` enum | Verify in migration — present in model usage |
| `payments` provider/status | ✅ Present |

---

## Cascade Rules

**Current:** None at DB level.

**Application behavior:**
- Order cancel: status update only (no hard delete)
- CRM tag assignment: `delete()` then recreate on tag update
- Soft deletes on orders preserve history

---

## Seeders

| File | Purpose |
|------|---------|
| `DatabaseSeeder.php` | Pilot tenant, super admin, owner, 5 meals, inventory, recipe, branding, status, feature flags, platform modules |
| `PricingSeeder.php` | Plans (Starter/Growth/Pro), features, assigns Growth to pilot |

**Quality issues:**
- Demo passwords documented in seeder comments
- Single tenant only — adequate for pilot

---

## Factories

| File | Status |
|------|--------|
| `UserFactory.php` | ❌ Broken namespace (`App\Models\User`) |

**Missing factories:** Order, Meal, Customer, Tenant, InventoryItem — limits testability.

---

## Duplicate Table Detection

**Result:** No duplicate table names across migrations.

---

## Data Integrity Rules (Bible §15)

| Rule | Enforced |
|------|----------|
| Orders don't directly modify inventory | ✅ Via `OrderCompleted` event → `InventoryService` |
| Inventory changes via transactions | ✅ `recordTransaction()` always |
| CRM event-driven | ✅ Listeners on order events |
| Loyalty transactional | ✅ DB transactions in `LoyaltyService` |

---

## Recommendations

1. **Migration: add foreign keys** with RESTRICT/CASCADE appropriate per relationship  
2. **Migration: add `inventory_impact` to `meal_options`**  
3. **Migration: add index on `payments(status)`**, `notifications(is_read)`  
4. **Fix UserFactory** namespace  
5. **Add factories** for core domain models  
6. **Consider soft delete on users** for staff deactivation audit trail  

---

*Database structure is comprehensive for Phase 1 scope but lacks relational hardening expected for production.*
