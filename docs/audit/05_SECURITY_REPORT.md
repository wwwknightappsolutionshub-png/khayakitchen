# KhayaOS Phase 1 Pilot — Security Report

**Audit date:** 2026-07-03  
**Method:** Static code review of backend middleware, auth, config, and frontend client. No penetration test performed.

---

## Executive Summary

| Area | Status | Risk Level |
|------|--------|------------|
| RBAC | Implemented (static) | Medium |
| JWT/Session (Sanctum) | Implemented | Medium |
| Password hashing | Implemented | Low |
| Tenant isolation | Strong | Low |
| API throttling | **Not implemented** | **High** |
| Rate limiting (app-level) | **Not implemented** | **High** |
| XSS prevention | Adequate (React default) | Low |
| SQL injection | Mitigated (Eloquent) | Low |
| CSRF | N/A for bearer API | Low |
| Secret management | Env-based | Medium |
| CORS | **Permissive (`*`)** | **High** |
| Push/WhatsApp secrets | Missing/incomplete | Medium |

**Overall security posture:** **Not production-ready** without rate limiting, CORS lockdown, and guest-order threat modeling.

---

## RBAC

**Verified:**
- `PermissionService` (`backend/app/Shared/Auth/PermissionService.php`) maps roles → permissions
- `LoadPermissions` middleware attaches permissions to request
- Services call `authorize()` / `has()` before mutations
- Kitchen limited to `orders.update_status`, `kitchen.view`
- Super admin isolated to `/platform/*`

**Gaps:**
- Permissions not stored in DB — cannot audit role changes
- No per-endpoint middleware (`can:orders.create`) — relies on developer discipline in services
- `POST /loyalty/earn` and `/redeem` callable by any authenticated role with loyalty feature (should be internal)
- `POST /inventory/consume` exposed to authenticated users with inventory permission (should be system-only)

**Risk:** Privilege escalation via missed `authorize()` in new code.

---

## JWT / Session (Sanctum)

**Verified:**
- API uses Bearer tokens via `auth:sanctum`
- Logout deletes current token (`AuthService`)
- `personal_access_tokens` table migration present

**Gaps:**
- Token expiration: `null` in `config/sanctum.php` — **tokens do not expire**
- No token refresh flow
- No device/session management UI
- Tokens stored in `localStorage` (`khayaos_token`) — vulnerable to XSS theft

**Recommendation:** Set token TTL; consider `httpOnly` cookie strategy for staff admin (with CSRF for cookie mode).

---

## Password Hashing

**Verified:**
- `User` model uses `'password' => 'hashed'` cast
- `BCRYPT_ROUNDS` configurable via env (default 12)

**Gaps:**
- Seeder creates users with plain `'password'` string — Laravel cast hashes on create (OK) but **known demo passwords** in `DatabaseSeeder.php`
- No password complexity policy
- No account lockout after failed logins

---

## Tenant Isolation

**Verified:**
- `ResolveTenant` + `CheckTenantAccess` middleware chain
- `HasTenant` global scope on tenant models
- Super admin cannot access tenant routes (403 `PLATFORM_ONLY`)
- User `tenant_id` must match resolved tenant
- Suspended tenant / disabled user blocked
- Broadcast channels verify tenant membership (`routes/channels.php`)

**Tested via code review:** No obvious tenant_id bypass in controllers (all use scoped models).

**Residual risk:** `withoutGlobalScopes()` used intentionally in `PushNotificationService` for device tokens — tenant_id still filtered manually.

---

## API Throttling / Rate Limiting

**Status:** ❌ **NOT IMPLEMENTED**

**Verified:**
- Grep for `throttle`, `RateLimiter` on routes: **no matches** in application code
- Only password reset throttle in `config/auth.php` (unused for API login)

**Risk:**
- Brute-force `POST /auth/login`
- Spam `POST /orders` (once public endpoint added)
- Enumeration of `GET /menu`, customer preference endpoints

**Required fix:**
```php
Route::middleware(['throttle:login'])->group(...);
// bootstrap/app.php RateLimiter::for('login', fn () => Limit::perMinute(5)->by($request->ip()));
```

---

## XSS Prevention

**Verified:**
- React JSX auto-escapes rendered content
- No `dangerouslySetInnerHTML` in customer order flows (grep clean)
- API returns JSON consumed by React

**Gaps:**
- Tenant-controlled `branding` text fields (tagline, promo message) rendered in customer UI — trust tenant content (acceptable for pilot)
- `maximumScale: 1` is accessibility concern, not XSS

---

## SQL Injection

**Verified:**
- Eloquent ORM used throughout
- `DB::table()->insert()` uses parameter binding for audit/activity logs
- No user-controlled raw SQL found

**Gaps:**
- Lack of FK constraints doesn't cause injection but allows data integrity issues

---

## CSRF

**Status:** Not applicable for current pure JSON Bearer API from SPA.

If cookie-based Sanctum SPA auth added later, CSRF + `sanctum/csrf-cookie` must be enforced.

---

## Secret Management

**Verified:**
- `.env` / `.env.example` pattern
- WhatsApp, Reverb, DB credentials via env
- `.env` not committed (assumed)

**Gaps:**
- No secrets rotation documentation
- VAPID keys not in `.env.example` (push not configured)
- Docker compose has hardcoded `POSTGRES_PASSWORD: khayaos`
- `APP_DEBUG: true` in docker-compose

---

## Environment Variables

| Variable | Purpose | Documented in .env.example |
|----------|---------|--------------------------|
| `APP_KEY` | Encryption | Yes (Laravel) |
| `DB_*` | Database | Yes |
| `REVERB_*` | WebSockets | Partial |
| `WHATSAPP_*` | Messaging | Check whatsapp.php |
| `NEXT_PUBLIC_API_URL` | Frontend API | Frontend .env.local |
| `NEXT_PUBLIC_VAPID_KEY` | Push | **Missing** |

---

## Additional Findings

### Authentication on public endpoints
- `GET /menu`, `POST /customer/notifications/*` — no auth (intended)
- No signed tokens for order tracking — anyone with order UUID can poll `GET /realtime/order-status/{id}` (**information disclosure**)

### Feature flag updates
- Tenant `PATCH /feature-flags` allowed for `owner` — may be intentional but differs from API spec §15.2

### Error responses
- Standardized error format — good; ensure stack traces disabled in production (`APP_DEBUG=false`)

### HTTPS
- Not enforced at application layer — depends on reverse proxy

### Dependency audit
- Not run in this audit — recommend `composer audit` + `npm audit` before release

---

## Security Checklist (Pre-Pilot)

| # | Action | Priority |
|---|--------|----------|
| 1 | Add rate limiting on login + public write endpoints | Critical |
| 2 | Restrict CORS to production frontend origin(s) | High |
| 3 | Set Sanctum token expiration | High |
| 4 | Secure order tracking (token or customer phone verification) | High |
| 5 | Restrict inventory/loyalty internal endpoints to system roles | High |
| 6 | `APP_DEBUG=false`, strong `APP_KEY`, rotate demo passwords | High |
| 7 | Add security headers (HSTS, X-Frame-Options) via middleware/nginx | Medium |
| 8 | Run dependency vulnerability scan | Medium |
| 9 | Document secrets setup for WhatsApp/VAPID/Reverb | Medium |

---

*This report reflects static analysis only. A staged penetration test is recommended before public pilot.*
