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

- **Admin:** `/ops/login` → `/ops/orders` (or `/ops/kitchen`)
- **Platform (Super Admin):** `/ops/login` → `/ops/platform/dashboard`
- **Customer:** `/menu` → order flow
- Legacy `/login`, `/orders`, `/platform/*`, `/get-started`, `/pricing` permanently redirect under `/ops/*`

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

## Implementation Standard (Mandatory)

**All features must follow the approved implementation approach.** No exceptions.

Read **`docs/IMPLEMENTATION_STANDARD.md`** before writing code. It defines:

- Summary of the last production edit (Phase 1.0.2 SaaS Commercialization, commit `ffa9d2f`)
- Mandatory rules: extend existing architecture, complete backend + frontend enforcement, audit logging, tests, build gates, and deployment steps
- **VPS deploy:** `docs/VPS_DEPLOY.md` — always use `git -c safe.directory=/www/wwwroot/khayaos.prohost.cloud` on production server
- QA checklist and forbidden patterns (TODOs, UI-only gates, parallel services)

Cursor agents load this automatically via `.cursor/rules/khayaos-implementation-standard.mdc`.

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
10. **`IMPLEMENTATION_STANDARD.md`** — **Mandatory feature implementation standard (read first)**
11. **`VPS_DEPLOY.md`** — **Production VPS deploy snippet (git safe.directory required)**

## Architecture Highlights

- **Modular monolith** with strict module boundaries
- **Event-driven** cross-module communication (`OrderCreated`, `InventoryUpdated`, etc.)
- **Multi-tenant** via `tenant_id` on every table
- **Inventory-first** — all stock changes via transactions and recipes
- **Feature flags** per tenant per module
