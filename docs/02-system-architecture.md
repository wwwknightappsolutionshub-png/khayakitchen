# 02-system-architecture.md

## 1.0 Architectural Overview

KhayaOS is a modular monolith backend + modern PWA frontend system, designed for:

- fast MVP deployment (pilot restaurant)
- clean modular expansion (SaaS future)
- strict multi-tenant isolation
- event-driven business logic
- inventory-first data flow

## 2.0 High-Level Architecture

```
                ┌──────────────────────┐
                │   Next.js PWA       │
                │ (Customer + Admin)   │
                └─────────┬────────────┘
                          │
                          ▼
                ┌──────────────────────┐
                │   API Layer          │
                │ (Laravel 12)         │
                └─────────┬────────────┘
                          │
        ┌─────────────────┼─────────────────┐
        ▼                 ▼                 ▼
┌──────────────┐ ┌──────────────┐ ┌──────────────┐
│ Inventory    │ │ Orders       │ │ CRM/Loyalty  │
│ Engine       │ │ Engine       │ │ Engine       │
└──────────────┘ └──────────────┘ └──────────────┘
        │                 │                 │
        └──────────┬──────┴──────┬─────────┘
                   ▼             ▼
            ┌──────────────────────────┐
            │ PostgreSQL Database      │
            └──────────────────────────┘
                   │
          ┌────────┴────────┐
          ▼                 ▼
     Redis Queue      File Storage (S3)
```

## 3.0 Architectural Style

### 3.1 Modular Monolith (Core Decision)

KhayaOS is NOT microservices.

It is a modular monolith with strict boundaries.

**Why:**

- faster development for MVP
- easier debugging
- simpler deployment
- still scalable when structured correctly

### 3.2 Module Isolation Rule

Each module must behave like a mini-service.

**Example modules:**

- Inventory Module
- Orders Module
- CRM Module
- Loyalty Module
- Menu Module
- Kitchen Module
- Reporting Module

Each module has:

- its own service layer
- its own repository layer
- its own domain logic
- no direct cross-module database access

Interaction only via:

- events
- service interfaces
- domain contracts

## 4.0 Multi-Tenancy Architecture

### 4.1 Tenant Model

Every record belongs to a tenant:

```
tenant_id → REQUIRED ON EVERY TABLE
```

### 4.2 Isolation Strategy

**Strategy: Shared Database + Tenant Column**

- single PostgreSQL database
- all tables include `tenant_id`
- enforced via middleware + query scopes

### 4.3 Enforcement Rules

- No query may omit tenant filter
- Middleware injects tenant context
- Repository layer enforces isolation
- Tests must verify isolation

## 5.0 Frontend Architecture (Next.js PWA)

### 5.1 Structure

```
app/
  (customer)/
  (admin)/
  (auth)/
  (shared)/
```

### 5.2 Dual Interface System

**Customer Interface (PWA)**

- mobile-first
- ultra-simple ordering flow
- installable
- offline caching (partial)

**Admin Interface**

- dashboard-heavy
- analytics-driven
- role-based UI
- real-time updates

## 6.0 Backend Architecture (Laravel)

### 6.1 Structure

```
app/
  Modules/
    Orders/
    Inventory/
    CRM/
    Loyalty/
    Menu/
    Kitchen/
    Reporting/
  Shared/
    Auth/
    Tenancy/
    Events/
    Notifications/
```

### 6.2 Design Pattern

Each module contains:

- Controller
- Service
- Repository
- DTOs
- Events
- Listeners
- Policies

## 7.0 Data Flow Architecture

### 7.1 Order Flow

```
Customer places order
→ Order Module creates order
→ Event: OrderCreated
→ Inventory Module consumes stock
→ Kitchen Module receives ticket
→ CRM updates customer history
→ Loyalty updates points
→ Notification sent
```

### 7.2 Inventory Flow

```
Purchase added
→ StockIn event
→ Inventory updated

Order placed
→ Recipe consumed
→ StockOut event
→ Inventory updated
```

## 8.0 Event-Driven Design

KhayaOS uses internal domain events.

**Examples:**

- `OrderCreated`
- `OrderCompleted`
- `StockUpdated`
- `LoyaltyPointsAdded`
- `CustomerCreated`

**Rules:**

- No module directly modifies another module's state
- All cross-module communication uses events
- Events are persisted for auditability (optional future upgrade)

## 9.0 Feature Flag System

### 9.1 Concept

Every module can be turned on/off per tenant.

```
inventory: true
orders: true
loyalty: true
crm: true
accounting: false
forecasting: false
```

### 9.2 Enforcement

- backend checks flags before execution
- frontend hides disabled modules
- API returns 403 if disabled

## 10.0 Inventory-Centric Design Principle

Inventory is the system backbone.

Everything flows from it:

```
Inventory
  ↓
Recipes
  ↓
Menu
  ↓
Orders
  ↓
Kitchen
  ↓
CRM
  ↓
Analytics
```

This ensures:

- profitability tracking
- waste visibility
- cost accuracy
- forecasting readiness

## 11.0 Real-Time System Design

### 11.1 Requirements

- Kitchen updates must be near real-time
- Orders must reflect immediately
- Dashboard metrics must refresh frequently

### 11.2 Implementation

- Redis Pub/Sub or queue events
- WebSockets (Laravel Echo or similar)
- Optimistic UI updates in frontend

## 12.0 Security Architecture

- Sanctum authentication
- Role-based access control (RBAC)
- Tenant isolation middleware
- Activity logging for all critical actions
- Audit trails for inventory and orders

## 13.0 Performance Strategy

Database indexing on:

- `tenant_id`
- order status
- inventory items

Query caching via Redis.

Background job processing for:

- loyalty updates
- notifications
- analytics aggregation

## 14.0 Scalability Design

System can scale by:

- adding database replicas
- splitting modules into services later
- introducing event bus (Kafka/RabbitMQ later if needed)
- isolating tenants into separate DBs (future upgrade path)

## 15.0 Deployment Architecture

**Docker Containers:**

- frontend (Next.js)
- backend (Laravel)
- postgres
- redis
- nginx

**CI/CD:**

- GitHub Actions
- automatic testing
- staged deployments

## 16.0 Key Architectural Decisions Summary

- Modular Monolith (not microservices)
- Inventory-first system design
- Event-driven internal communication
- Shared database multi-tenancy
- Feature flag controlled modules
- PWA-first frontend
- Real-time kitchen + order updates
