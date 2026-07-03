# 08-cursor-bootstrap-prompt.md

## START PROMPT

You are now working on a production-grade system called KhayaOS.

This is not a prototype.

This is a modular, multi-tenant Business Intelligence Operating System for Food Businesses.

## 1.0 ABSOLUTE RULES (NON-NEGOTIABLE)

You must strictly follow the `/docs` folder in numerical order:

1. `00` Constitution
2. `01` Product Bible
3. `02` System Architecture
4. `03` UI Design System
5. `04` Database Bible
6. `05` API Specification
7. `06` Authentication & Tenant System
8. `07` Implementation Strategy

**❗ DO NOT:**

- invent business logic
- guess missing requirements
- bypass architecture rules
- merge modules incorrectly
- ignore tenant isolation
- create undocumented tables or endpoints
- hardcode business rules in frontend

**If anything is unclear → STOP and ask.**

## 2.0 SYSTEM TYPE

You are building:

- Modular Monolith Backend (Laravel 12)
- Next.js 14+ PWA Frontend
- PostgreSQL database
- Redis for queue/events
- Fully multi-tenant SaaS-ready architecture

## 3.0 INITIAL BUILD SCOPE (PHASE 1 ONLY)

Build ONLY the following modules first:

1. Authentication + Tenant System
2. Menu System
3. Order System
4. Inventory Engine
5. Kitchen Module
6. CRM Module
7. Loyalty Module
8. Dashboard
9. Notifications

## 4.0 ARCHITECTURE RULES

### Backend

- Laravel Modules architecture MUST be used
- Each module must be isolated:
  - Domain
  - Application (services)
  - Infrastructure (repositories)
  - Interfaces (controllers)
  - Events
- Controllers must be thin
- Business logic lives ONLY in services

### Frontend

- Next.js App Router
- Separate layouts:
  - `(customer)`
  - `(admin)`
- No direct API calls in components
- Use service layer abstraction
- Mobile-first PWA design

## 5.0 MULTI-TENANT RULE

EVERY database table must include:

```
tenant_id
```

ALL queries must be scoped to tenant.

No exceptions.

## 6.0 INVENTORY-FIRST RULE

Inventory is the core engine.

All orders must:

- trigger recipe-based stock deduction
- emit `InventoryUpdated` events
- never modify inventory directly

## 7.0 EVENT SYSTEM RULE

You MUST implement internal events.

**Examples:**

- `OrderCreated`
- `OrderStatusUpdated`
- `InventoryConsumed`
- `LoyaltyPointsAdded`

Events must:

- be immutable
- be logged
- trigger module reactions

## 8.0 FEATURE FLAGS

Every module must be wrapped with feature flags.

**Example:**

```
inventory.enabled
crm.enabled
loyalty.enabled
```

If disabled:

- backend must block execution
- frontend must hide UI

## 9.0 BUILD ORDER (STRICT)

You must implement in this order:

1. Auth + Tenant System
2. Menu Module
3. Order Module
4. Inventory Engine
5. Kitchen Module
6. CRM Module
7. Loyalty Module
8. Dashboard
9. Notifications

## 10.0 DATABASE RULES

You must strictly follow the schema defined in:

**`04-database-bible.md`**

Do NOT create new tables unless explicitly required.

## 11.0 API RULES

You must strictly follow:

**`05-api-specification.md`**

No extra endpoints unless approved.

## 12.0 UI RULES

You must follow:

- Anek typography system
- Dark enterprise UI
- Inventory-first dashboard design
- Mobile-first customer experience

## 13.0 SUCCESS CRITERIA

System is successful when:

- Customer can place order end-to-end
- Kitchen can process orders live
- Inventory updates automatically from orders
- Owner can view dashboard insights
- Multi-tenant isolation works perfectly

## 14.0 FIRST ACTION YOU MUST TAKE

Before writing any code:

1. Read ALL `/docs` files in order
2. Confirm understanding of architecture
3. Output:
   - folder structure plan
   - module implementation plan
   - any missing assumptions

**DO NOT start coding until this is done.**
