# 06-authentication-tenant-system.md

## 1.0 Authentication Philosophy

Authentication in KhayaOS is designed to:

- identify users reliably
- enforce tenant isolation strictly
- support multiple roles per system
- remain stateless for API scalability
- be secure by default

No request is trusted without explicit identity + tenant resolution.

## 2.0 Identity Model

Every authenticated request resolves:

```
User Identity
+ Tenant Identity
+ Role Identity
+ Permission Scope
```

### 2.1 Core Principle

A user is NEVER global unless they are Super Admin.

All other users are always scoped to a tenant.

## 3.0 User Types

### 3.1 Super Admin (Platform Level)

- Exists outside tenant system
- Can access all tenants
- Can enable/disable modules per tenant
- Cannot place orders or operate restaurant functions

### 3.2 Tenant User (Business Level)

Belongs strictly to one tenant:

- Owner
- Manager
- Kitchen Staff
- Delivery Staff
- Staff

### 3.3 Customer User

- Belongs to a tenant OR can be guest-linked
- Can place orders only within tenant context
- Has no admin privileges

## 4.0 Authentication Strategy

### 4.1 Method

**Primary auth method:**

- Laravel Sanctum (session or token-based hybrid)
- Optional JWT layer for external apps (future)

### 4.2 Login Flow

```
Email + Password
→ Validate credentials
→ Resolve tenant
→ Assign roles
→ Issue token
→ Attach tenant context
```

### 4.3 Token Structure

Token MUST contain:

```json
{
  "user_id": "uuid",
  "tenant_id": "uuid",
  "role": "owner",
  "permissions": []
}
```

## 5.0 Tenant Resolution System

Every request MUST resolve tenant BEFORE business logic.

### 5.1 Resolution Priority

1. Super Admin override (manual selection)
2. Auth token `tenant_id`
3. Subdomain (`tenant.khayaos.com`)
4. Request header (`X-Tenant-ID`)

### 5.2 Enforcement Rule

If tenant cannot be resolved:

- request MUST be rejected
- no fallback to default tenant

## 6.0 Middleware Architecture

### 6.1 Required Middleware Stack

Every API request passes through:

1. `AuthenticateUser`
2. `ResolveTenant`
3. `CheckTenantAccess`
4. `LoadUserRoles`
5. `LoadPermissions`
6. `ApplyFeatureFlags`

### 6.2 Tenant Middleware Rule

Injects:

- `request.tenant`
- `request.user`
- `request.permissions`

## 7.0 Role-Based Access Control (RBAC)

### 7.1 Role Types

- `super_admin`
- `owner`
- `manager`
- `kitchen`
- `staff`
- `customer`

### 7.2 Permission Model

Permissions are granular:

- `orders.create`
- `orders.update`
- `orders.view`
- `inventory.manage`
- `inventory.adjust`
- `crm.view`
- `crm.manage`
- `loyalty.manage`
- `dashboard.view`
- `settings.manage`

### 7.3 Role → Permission Mapping

**Example:**

```
owner:
  ALL permissions

manager:
  orders.*
  inventory.*
  crm.view
  dashboard.view

kitchen:
  orders.view
  orders.update_status

customer:
  orders.create
  orders.view_own
```

### 7.4 Enforcement Rule

- Permissions checked at service layer
- Never rely only on frontend restrictions
- Backend is source of truth

## 8.0 Tenant Isolation Enforcement

### 8.1 Database Rule

All queries MUST include:

```sql
WHERE tenant_id = currentTenant()
```

### 8.2 Service Layer Rule

No service may:

- query cross-tenant data
- bypass tenant scope
- accept raw `tenant_id` input from client (except Super Admin tools)

### 8.3 Repository Rule

All repositories must auto-apply tenant scope:

- `BaseRepository` applies tenant filter automatically

## 9.0 Super Admin System

### 9.1 Capabilities

Super Admin can:

- view all tenants
- enable/disable feature flags
- inspect system health
- impersonate tenant (debug mode)
- manage billing (future phase)

### 9.2 Safety Rule

When impersonating tenant:

- must be explicitly marked
- must be logged
- cannot persist actions without audit trail

## 10.0 Session Management

### 10.1 Token Lifecycle

- Access tokens: short-lived
- Refresh tokens: longer-lived (optional future enhancement)

### 10.2 Logout Behavior

- invalidates token
- clears session context
- logs activity event

## 11.0 Security Rules

### 11.1 Mandatory Rules

- passwords hashed using bcrypt/argon2
- no plaintext secrets stored
- all auth failures logged
- rate limiting on login endpoints
- CSRF protection for session-based auth

### 11.2 Abuse Protection

- brute-force detection
- IP throttling
- tenant-level rate limiting (future enhancement)

## 12.0 Customer Authentication

### 12.1 Customer Model

Customers can:

- optionally register
- optionally order as guest (configurable per tenant)

### 12.2 Guest Orders

If enabled:

- phone/email required at checkout
- system creates implicit customer record

## 13.0 Feature Flag Integration

Authentication layer must respect:

- tenant-level feature flags
- role-based feature visibility

**Example:**

```
if inventory.disabled:
  block inventory endpoints
```

## 14.0 Audit Requirements

All authentication events must be logged:

- login success/failure
- logout
- role changes
- impersonation events
- permission denials

## 15.0 Key Security Principle

No frontend restriction is considered secure.

Everything must be enforced:

- at middleware level
- service layer level
- repository layer scope

## 16.0 System Trust Model

KhayaOS operates under:

- Zero implicit trust
- Explicit tenant resolution
- Explicit permission checks
- Fully audited actions
