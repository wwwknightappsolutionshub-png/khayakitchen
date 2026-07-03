# 04-database-bible.md

## 1.0 Database Philosophy

KhayaOS uses a single-source relational data model built for:

- strict multi-tenancy
- auditability
- inventory accuracy
- event traceability
- future SaaS scaling

Database is the source of truth for everything business-critical.

## 2.0 Core Design Rules

### 2.1 Multi-Tenant Rule (Non-Negotiable)

Every table MUST include:

```
tenant_id UUID NOT NULL
```

No exceptions.

### 2.2 Soft Delete Rule

All business-critical tables use:

```
deleted_at TIMESTAMP NULL
```

No hard deletes for:

- orders
- inventory
- customers
- transactions

### 2.3 Audit Rule

Critical tables must include:

- `created_at`
- `updated_at`
- `created_by`
- `updated_by`

### 2.4 Immutable Financial Data Rule

Once an order is completed:

- it cannot be edited
- only reversal transactions are allowed

## 3.0 Core Entity Map

```
TENANTS
USERS
ROLES
CUSTOMERS

MENUS
MEALS
MEAL_OPTIONS
OPTION_GROUPS

ORDERS
ORDER_ITEMS
ORDER_ITEM_OPTIONS

INVENTORY_ITEMS
INVENTORY_TRANSACTIONS
RECIPE_DEFINITIONS
RECIPE_COMPONENTS

LOYALTY_ACCOUNTS
LOYALTY_TRANSACTIONS
LOYALTY_REWARDS

CRM_PROFILES
CRM_TAGS
CRM_TAG_ASSIGNMENTS

PAYMENTS
PAYMENT_TRANSACTIONS

DELIVERY_ORDERS
DELIVERY_ZONES

NOTIFICATIONS
ACTIVITY_LOGS
```

## 4.0 Multi-Tenant Structure

### 4.1 TENANTS

| Column | Type |
|--------|------|
| id | UUID PK |
| name | TEXT |
| slug | TEXT UNIQUE |
| logo_url | TEXT |
| primary_color | TEXT |
| status | ENUM(active, suspended) |
| created_at | TIMESTAMP |
| updated_at | TIMESTAMP |

### 4.2 USERS

| Column | Type |
|--------|------|
| id | UUID PK |
| tenant_id | UUID FK |
| name | TEXT |
| email | TEXT |
| password_hash | TEXT |
| role | ENUM(super_admin, owner, manager, kitchen, staff) |
| status | ENUM(active, disabled) |
| last_login_at | TIMESTAMP |
| created_at | TIMESTAMP |
| updated_at | TIMESTAMP |

## 5.0 Menu System

### 5.1 MEALS

| Column | Type |
|--------|------|
| id | UUID PK |
| tenant_id | UUID |
| name | TEXT |
| description | TEXT |
| image_url | TEXT |
| is_active | BOOLEAN |
| created_at | TIMESTAMP |
| updated_at | TIMESTAMP |

### 5.2 OPTION GROUPS

| Column | Type |
|--------|------|
| id | UUID PK |
| tenant_id | UUID |
| meal_id | UUID |
| name | TEXT |
| type | ENUM(single, multiple) |
| created_at | TIMESTAMP |

**Examples:**

- Size
- Protein
- Extras

### 5.3 MEAL OPTIONS

| Column | Type |
|--------|------|
| id | UUID PK |
| tenant_id | UUID |
| option_group_id | UUID |
| name | TEXT |
| price_delta | DECIMAL |
| inventory_impact | JSONB |
| is_active | BOOLEAN |

## 6.0 Order System

### 6.1 ORDERS

| Column | Type |
|--------|------|
| id | UUID PK |
| tenant_id | UUID |
| customer_id | UUID |
| status | ENUM(pending, accepted, preparing, ready, completed, cancelled) |
| order_type | ENUM(pickup, delivery) |
| scheduled_time | TIMESTAMP |
| total_amount | DECIMAL |
| created_at | TIMESTAMP |
| updated_at | TIMESTAMP |

### 6.2 ORDER ITEMS

| Column | Type |
|--------|------|
| id | UUID PK |
| tenant_id | UUID |
| order_id | UUID |
| meal_id | UUID |
| quantity | INT |
| base_price | DECIMAL |
| final_price | DECIMAL |

### 6.3 ORDER ITEM OPTIONS

| Column | Type |
|--------|------|
| id | UUID PK |
| tenant_id | UUID |
| order_item_id | UUID |
| option_id | UUID |
| price_delta | DECIMAL |

## 7.0 Inventory System (CORE ENGINE)

### 7.1 INVENTORY ITEMS

| Column | Type |
|--------|------|
| id | UUID PK |
| tenant_id | UUID |
| name | TEXT |
| unit | ENUM(kg, g, liter, unit) |
| current_stock | DECIMAL |
| reorder_level | DECIMAL |
| cost_per_unit | DECIMAL |
| created_at | TIMESTAMP |

### 7.2 INVENTORY TRANSACTIONS

| Column | Type |
|--------|------|
| id | UUID PK |
| tenant_id | UUID |
| inventory_item_id | UUID |
| type | ENUM(in, out, waste, adjustment) |
| quantity | DECIMAL |
| reference_type | TEXT |
| reference_id | UUID |
| created_at | TIMESTAMP |

### 7.3 RECIPE DEFINITIONS

| Column | Type |
|--------|------|
| id | UUID PK |
| tenant_id | UUID |
| meal_id | UUID |
| portion_size | ENUM(small, medium, large) |
| created_at | TIMESTAMP |

### 7.4 RECIPE COMPONENTS

| Column | Type |
|--------|------|
| id | UUID PK |
| tenant_id | UUID |
| recipe_id | UUID |
| inventory_item_id | UUID |
| quantity | DECIMAL |

## 8.0 CRM System

### 8.1 CRM PROFILES

| Column | Type |
|--------|------|
| id | UUID PK |
| tenant_id | UUID |
| customer_id | UUID |
| total_spent | DECIMAL |
| order_count | INT |
| last_order_at | TIMESTAMP |
| favorite_meal_id | UUID |
| created_at | TIMESTAMP |

### 8.2 CRM TAGS

| Column | Type |
|--------|------|
| id | UUID PK |
| tenant_id | UUID |
| name | TEXT |
| color | TEXT |

### 8.3 TAG ASSIGNMENTS

| Column | Type |
|--------|------|
| id | UUID PK |
| tenant_id | UUID |
| customer_id | UUID |
| tag_id | UUID |

## 9.0 Loyalty System

### 9.1 LOYALTY ACCOUNTS

| Column | Type |
|--------|------|
| id | UUID PK |
| tenant_id | UUID |
| customer_id | UUID |
| points_balance | INT |
| tier | ENUM(bronze, silver, gold) |
| created_at | TIMESTAMP |

### 9.2 LOYALTY TRANSACTIONS

| Column | Type |
|--------|------|
| id | UUID PK |
| tenant_id | UUID |
| customer_id | UUID |
| type | ENUM(earn, redeem) |
| points | INT |
| reference_id | UUID |
| created_at | TIMESTAMP |

## 10.0 Payments

| Column | Type |
|--------|------|
| id | UUID PK |
| tenant_id | UUID |
| order_id | UUID |
| provider | TEXT |
| status | ENUM(pending, paid, failed, refunded) |
| amount | DECIMAL |
| created_at | TIMESTAMP |

## 11.0 Delivery System

**DELIVERY ZONES**

| Column | Type |
|--------|------|
| id | UUID PK |
| tenant_id | UUID |
| name | TEXT |
| fee | DECIMAL |
| postcodes | TEXT[] |

**DELIVERY ORDERS**

| Column | Type |
|--------|------|
| id | UUID PK |
| tenant_id | UUID |
| order_id | UUID |
| status | ENUM(pending, assigned, picked_up, delivered) |
| driver_name | TEXT |

## 12.0 Notifications

| Column | Type |
|--------|------|
| id | UUID PK |
| tenant_id | UUID |
| user_id | UUID |
| type | TEXT |
| message | TEXT |
| is_read | BOOLEAN |
| created_at | TIMESTAMP |

## 13.0 Activity Log (CRITICAL)

| Column | Type |
|--------|------|
| id | UUID PK |
| tenant_id | UUID |
| user_id | UUID |
| action | TEXT |
| entity_type | TEXT |
| entity_id | UUID |
| metadata | JSONB |
| created_at | TIMESTAMP |

## 14.0 Indexing Rules

Must index:

- `tenant_id` (every table)
- order status
- `created_at`
- `customer_id`
- `inventory_item_id`
- `meal_id`

## 15.0 Data Flow Integrity Rules

- Orders must never directly modify inventory
- Inventory changes must always go through transactions
- CRM updates must be event-driven
- Loyalty must be transactional

## 16.0 Future-Proof Tables (Reserved)

These exist conceptually for SaaS expansion:

- suppliers
- purchase_orders
- staff_payroll
- multi_branch_locations
- forecasting_models
- ai_recommendations
- subscriptions
- billing_accounts

## 17.0 Key Design Insight

This database is not just storage.

It is a business truth engine:

- Orders = revenue reality
- Inventory = cost reality
- CRM = customer reality
- Loyalty = retention mechanism
- Logs = accountability layer
