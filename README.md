# KhayaOS

A modular, multi-tenant Business Operating System for food businesses.

**Stack:** Laravel 13 (modular monolith) · Next.js 16 PWA · PostgreSQL · Redis

## Project Structure

```
KhayaOS/
├── backend/          # Laravel API (modular monolith)
├── frontend/         # Next.js PWA (customer + admin)
├── docs/             # Architecture & product specifications
├── docker/           # Docker Compose & Dockerfiles
└── infrastructure/   # Reserved for CI/CD configs
```

## Quick Start (Local)

### Prerequisites

- PHP 8.3+, Composer
- Node.js 22+, npm
- SQLite (default) or PostgreSQL

### 1. Backend

```powershell
cd backend
composer install
cp .env.example .env   # or copy manually on Windows
php artisan key:generate
php artisan migrate:fresh --seed
php artisan serve
```

API: `http://localhost:8000/api/v1`

**Pilot credentials:**
- Owner: `owner@khayaos.com` / `password`
- Platform Super Admin: `admin@khayaos.com` / `password`

### 2. Frontend

```powershell
cd frontend
npm install
npm run dev
```

App: `http://localhost:3000`

- **Admin:** `/login` → dashboard
- **Platform (Super Admin):** `/login` → `/platform/dashboard`
- **Customer:** `/menu` → order flow

### 3. Docker (optional)

```powershell
cd docker
docker compose up --build
```

## Phase 1 Modules

| Module | Status |
|--------|--------|
| Auth + Tenant System | ✅ |
| Menu | ✅ |
| Orders | ✅ |
| Inventory Engine | ✅ |
| Kitchen | ✅ |
| CRM | ✅ |
| Loyalty | ✅ |
| Dashboard | ✅ |
| Notifications | ✅ |

## Documentation

Read `/docs` in numerical order before making changes:

1. `00-constitution.md` — Core principles
2. `01-product-bible.md` — Product scope
3. `02-system-architecture.md` — Architecture
4. `03-ui-design-system.md` — UI/UX
5. `04-database-bible.md` — Schema
6. `05-api-specification.md` — API contracts
7. `06-authentication-tenant-system.md` — Auth & tenancy
8. `07-implementation-strategy.md` — Build rules
9. `08-cursor-bootstrap-prompt.md` — Agent bootstrap

## Architecture Highlights

- **Modular monolith** with strict module boundaries
- **Event-driven** cross-module communication (`OrderCreated`, `InventoryUpdated`, etc.)
- **Multi-tenant** via `tenant_id` on every table
- **Inventory-first** — all stock changes via transactions and recipes
- **Feature flags** per tenant per module
