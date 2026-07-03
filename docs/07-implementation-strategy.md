# 07-implementation-strategy.md

## 1.0 Purpose of This Document

This document translates the architecture into a buildable structure for Cursor.

It defines:

- exact folder structure
- module boundaries
- coding rules
- service architecture
- frontend/backend integration rules
- how Phase 1 is implemented safely

This is the point where design becomes implementation-ready.

## 2.0 Implementation Philosophy

KhayaOS must be built as:

> A modular monolith with strict domain boundaries and event-driven communication.

**Rules:**

- no cross-module direct dependencies
- no business logic in controllers
- no shared "god services"
- all communication via services + events
- feature flags must wrap all modules

## 3.0 Monorepo Structure

```
khaya-os/

  backend/
  frontend/
  docs/

  infrastructure/
  docker/
```

## 4.0 Backend Structure (Laravel)

### 4.1 Core Layout

```
app/

  Modules/
    Orders/
    Inventory/
    Menu/
    CRM/
    Loyalty/
    Kitchen/
    Reporting/
    Notifications/

  Shared/
    Auth/
    Tenancy/
    Events/
    FeatureFlags/
    Database/
    Utils/
```

### 4.2 Module Structure Pattern

Each module MUST follow:

```
Orders/

  Domain/
    Models/
    ValueObjects/

  Application/
    Services/
    DTOs/

  Infrastructure/
    Repositories/

  Interfaces/
    Controllers/
    Requests/

  Events/
  Listeners/
  Policies/
```

## 5.0 Frontend Structure (Next.js PWA)

### 5.1 App Structure

```
app/

  (customer)/
  (admin)/
  (auth)/

  shared/
    components/
    hooks/
    lib/
    services/
```

### 5.2 Route Separation

**Customer App**

- `/`
- `/menu`
- `/cart`
- `/checkout`
- `/tracking`
- `/account`

**Admin App**

- `/dashboard`
- `/orders`
- `/inventory`
- `/kitchen`
- `/crm`
- `/loyalty`
- `/reports`
- `/settings`

## 6.0 Module Ownership Rule

Each module is fully responsible for:

- database logic (via repository)
- business rules (service layer)
- API endpoints
- frontend state logic (if applicable)
- events emitted

No module may depend directly on another module's internal code.

## 7.0 Service Layer Rules

### 7.1 Rule

All business logic MUST live in services:

```
Controller → Service → Repository → Database
```

Controllers are thin.

### 7.2 Example

```
OrderController
  → OrderService.createOrder()
    → InventoryService.reserveStock()
    → LoyaltyService.addPoints()
    → NotificationService.send()
```

## 8.0 Event System

### 8.1 Core Principle

Modules communicate via events only.

### 8.2 Event Flow Example

```
OrderCreated
  → Inventory module consumes stock
  → Kitchen module creates ticket
  → CRM updates customer history
  → Loyalty adds points
  → Notification sends update
```

### 8.3 Event Rules

- events are immutable
- events must be logged
- events must not contain business logic
- listeners must be idempotent

## 9.0 Feature Flag Integration

### 9.1 Rule

Every module must be wrapped:

```php
if (!featureEnabled('inventory')) {
   block access
}
```

### 9.2 Frontend Rule

- hidden modules not rendered
- disabled features show locked UI
- no broken navigation links

## 10.0 Tenant Enforcement Strategy

### 10.1 Backend Rule

All module queries must use:

- `BaseRepository` automatically applies `tenant_id` filter

### 10.2 Frontend Rule

- tenant context loaded at login
- no cross-tenant switching (except Super Admin)

## 11.0 Inventory Engine Implementation Priority

Inventory is NOT secondary.

It is the core engine.

### 11.1 Required Flow

```
Purchase Stock
→ Inventory In

Recipe Defined
→ Consumption Map

Order Placed
→ Inventory Out (via recipe)

Waste Logged
→ Inventory Adjustment
```

### 11.2 Rule

Inventory must NEVER be updated directly from UI.

All changes go through:

- services
- events
- transactions

## 12.0 Order System Implementation Priority

### 12.1 Order Flow

```
Create Order
→ Validate Menu
→ Calculate Price
→ Emit OrderCreated
→ Trigger downstream modules
```

### 12.2 Status Flow

```
pending → accepted → preparing → ready → completed
```

## 13.0 Frontend State Management Rules

### 13.1 Stack

- TanStack Query (server state)
- Zustand (UI state)
- React Hook Form (forms)

### 13.2 Rule

- no direct API calls inside components
- all API calls go through services layer
- shared hooks for reuse

## 14.0 API Integration Layer

Frontend MUST use:

```
services/
  orders.service.ts
  inventory.service.ts
  crm.service.ts
```

No fetch calls directly in components.

## 15.0 Folder Naming Conventions

- kebab-case for folders
- camelCase for functions
- PascalCase for components
- snake_case for database fields

## 16.0 Testing Strategy

**Backend**

- PHPUnit for services
- Feature tests for APIs
- Event tests for workflows

**Frontend**

- unit tests for components
- integration tests for flows

## 17.0 Build Order (IMPORTANT)

Cursor MUST follow this order:

**Phase 1 Build Order**

1. Auth + Tenant System
2. Menu Module
3. Order Module
4. Inventory Engine
5. Kitchen Module
6. CRM Module
7. Loyalty Module
8. Dashboard
9. Notifications

## 18.0 No-Guess Rule (CRITICAL)

Cursor must:

- stop if requirements are unclear
- never invent schema
- never create hidden dependencies
- never skip module boundaries

## 19.0 Production Readiness Rules

Every module must include:

- validation
- error handling
- logging
- rollback safety (where needed)
- idempotent operations (events)
