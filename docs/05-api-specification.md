# 05-api-specification.md

## 1.0 API Design Philosophy

KhayaOS API is:

- REST-based (initially)
- versioned
- tenant-aware
- stateless
- event-driven internally
- strict about validation

No implicit behavior.

No hidden logic.

## 2.0 Base URL Structure

```
https://api.khayaos.com/api/v1/
```

All endpoints MUST:

- include versioning (v1)
- respect tenant context
- enforce authentication where required

## 3.0 Authentication Flow

### 3.1 Login

`POST /auth/login`

**Request**

```json
{
  "email": "owner@restaurant.com",
  "password": "secret"
}
```

**Response**

```json
{
  "token": "jwt_or_sanctum_token",
  "user": {
    "id": "uuid",
    "role": "owner",
    "tenant_id": "uuid"
  }
}
```

### 3.2 Logout

`POST /auth/logout`

Invalidates session/token.

### 3.3 Get Current User

`GET /auth/me`

## 4.0 Tenant Resolution

Every request MUST resolve tenant via:

**Priority:**

1. Auth token (`tenant_id`)
2. Subdomain (`tenant.khayaos.com`)
3. Header (`X-Tenant-ID`)

## 5.0 MENU API

### 5.1 Get Menu

`GET /menu`

**Response**

```json
{
  "meals": [
    {
      "id": "uuid",
      "name": "Jollof Rice",
      "options": [
        {
          "group": "Protein",
          "items": ["Chicken", "Goat", "Fish"]
        }
      ]
    }
  ]
}
```

### 5.2 Create Meal (Admin)

`POST /menu/meals`

### 5.3 Update Meal

`PUT /menu/meals/{id}`

## 6.0 ORDER SYSTEM

### 6.1 Create Order

`POST /orders`

**Request**

```json
{
  "customer_id": "uuid",
  "order_type": "pickup",
  "scheduled_time": "2026-07-03T12:30:00Z",
  "items": [
    {
      "meal_id": "uuid",
      "quantity": 1,
      "options": [
        {
          "option_id": "uuid"
        }
      ]
    }
  ]
}
```

**Response**

```json
{
  "order_id": "uuid",
  "status": "pending",
  "total": 12.50
}
```

### 6.2 Get Orders

`GET /orders?status=pending`

### 6.3 Update Order Status

`PATCH /orders/{id}/status`

**Request**

```json
{
  "status": "preparing"
}
```

### 6.4 Cancel Order

`POST /orders/{id}/cancel`

## 7.0 INVENTORY API

### 7.1 Get Inventory

`GET /inventory`

### 7.2 Add Stock

`POST /inventory/stock-in`

```json
{
  "item_id": "uuid",
  "quantity": 10,
  "cost_per_unit": 2.50
}
```

### 7.3 Stock Consumption (Internal Only)

`POST /inventory/consume`

Triggered by:

- order completion
- recipe engine

### 7.4 Waste Log

`POST /inventory/waste`

## 8.0 RECIPE API

### 8.1 Create Recipe

`POST /recipes`

### 8.2 Get Recipes

`GET /recipes?meal_id=uuid`

## 9.0 CRM API

### 9.1 Get Customers

`GET /customers`

### 9.2 Get Customer Profile

`GET /customers/{id}`

### 9.3 Update CRM Tags

`POST /customers/{id}/tags`

## 10.0 LOYALTY API

### 10.1 Get Loyalty Account

`GET /loyalty/{customer_id}`

### 10.2 Add Points (Internal)

`POST /loyalty/earn`

Triggered by order completion.

### 10.3 Redeem Rewards

`POST /loyalty/redeem`

## 11.0 DASHBOARD API

### 11.1 Get KPIs

`GET /dashboard/kpis`

**Response**

```json
{
  "revenue_today": 450,
  "orders_today": 32,
  "active_customers": 18,
  "low_stock_items": 5
}
```

### 11.2 Sales Trends

`GET /dashboard/sales-trends`

### 11.3 Inventory Health

`GET /dashboard/inventory-health`

## 12.0 KITCHEN API

### 12.1 Get Active Orders

`GET /kitchen/orders`

### 12.2 Update Kitchen Status

`PATCH /kitchen/orders/{id}`

## 13.0 DELIVERY API

### 13.1 Create Delivery Order

`POST /delivery`

### 13.2 Update Delivery Status

`PATCH /delivery/{id}/status`

## 14.0 NOTIFICATIONS API

### 14.1 Get Notifications

`GET /notifications`

### 14.2 Mark as Read

`PATCH /notifications/{id}/read`

## 15.0 FEATURE FLAGS API

### 15.1 Get Tenant Flags

`GET /feature-flags`

### 15.2 Update Flags (Super Admin Only)

`PATCH /feature-flags`

## 16.0 ERROR FORMAT STANDARD

All errors MUST follow:

```json
{
  "error": true,
  "message": "Human readable message",
  "code": "ERROR_CODE",
  "details": {}
}
```

## 17.0 AUTHORIZATION RULES

- All endpoints require authentication except login
- Role-based access enforced per endpoint
- Tenant isolation enforced globally
- Super Admin overrides only for platform management

## 18.0 EVENT TRIGGERS (IMPORTANT)

Some endpoints trigger internal events:

| Endpoint | Event |
|----------|-------|
| `POST /orders` | `OrderCreated` |
| `PATCH /orders/status` | `OrderStatusUpdated` |
| `POST /inventory/consume` | `InventoryUpdated` |
| `POST /loyalty/earn` | `LoyaltyUpdated` |

These events drive:

- inventory updates
- CRM updates
- notifications
- analytics

## 19.0 API DESIGN PRINCIPLES

- No endpoint returns unrelated data
- No nested business logic in controllers
- No direct cross-module mutations
- All sensitive operations audited
- All writes validated strictly
