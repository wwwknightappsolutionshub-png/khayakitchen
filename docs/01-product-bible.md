# 01-product-bible.md

## 1.0 Product Overview

KhayaOS is a restaurant operating system designed for a single African food business (pilot tenant), with architecture that supports future expansion into a SaaS platform.

The pilot system must feel:

- simple for customers
- powerful for the owner
- efficient for kitchen staff
- intelligent in the background

It is NOT a marketplace and NOT a generic POS.

## 2.0 Pilot Business Context

The first deployment supports:

- Small African food canteen
- 5 core meals
- customisable options per meal
- pickup + delivery
- pre-order scheduling
- loyalty system
- basic CRM
- inventory tracking tied to recipes

## 3.0 Core Users (Pilot)

### 3.1 Customer

- Places orders via mobile PWA
- Chooses meal options
- Selects pickup or delivery
- Schedules order time
- Earns loyalty rewards
- Views order history

### 3.2 Business Owner

- Controls menu
- Controls inventory
- Manages pricing
- Views dashboard analytics
- Configures loyalty rules
- Views customer insights

### 3.3 Manager

- Oversees orders
- Manages kitchen flow
- Adjusts inventory (limited)
- Handles operational exceptions

### 3.4 Kitchen Staff

- Views incoming orders
- Updates order status
- No financial or configuration access

## 4.0 Core Product Modules (Pilot Scope)

### 4.1 Menu System

**Structure**

- Menu contains 5 core meals
- Each meal has configurable option groups

**Example:**

```
Jollof Rice
  - Size
  - Protein
  - Extras
  - Drink
```

**Rules**

- Options are dynamic, not hardcoded
- Prices can vary per option
- Some options may be limited per day
- Meals can be enabled/disabled per day

### 4.2 Ordering System

**Flow**

```
Select Meal
→ Configure Options
→ Choose Pickup or Delivery
→ Choose Time Slot
→ Checkout
→ Payment
→ Order Confirmation
```

**Rules**

- Orders are immutable once confirmed
- Orders have status lifecycle:
  - Pending → Accepted → Preparing → Ready → Completed
- Pre-orders are supported
- Time slots are controlled by business

### 4.3 Kitchen System

**Purpose**

Translate orders into production tasks.

**Features**

- Real-time order feed
- Large readable kitchen display
- Status updates per order
- Grouped by preparation time

**Rules**

- No pricing shown
- No customer data except name + order ID
- Must be ultra-low latency

### 4.4 Inventory System (Core Engine)

**Philosophy**

Inventory is the source of truth for business health.

**Structure**

Inventory is tracked via:

- Ingredients
- Stock entries
- Stock consumption
- Waste logs
- Adjustments

**Flow**

```
Purchase → Stock Added
Recipe → Stock Consumed
Order → Triggers Recipe Deduction
Waste → Stock Reduced
Adjustment → Manual Correction
```

**Rules**

- All movements are logged
- No silent stock changes
- Must support audit trail
- Must support cost tracking

### 4.5 Recipe Engine

Each meal is defined by a recipe:

**Example:**

```
Jollof Rice (Large)

Rice: 250g
Chicken: 1 unit
Oil: 20ml
Sauce: 100ml
Plantain: 2 slices
```

**Rules**

- Recipes determine inventory deduction
- Recipes can vary by portion size
- Recipes are tenant-configurable

### 4.6 Loyalty System

**Structure**

Customers earn progress-based rewards.

**Example:**

- 10 meals = free meal
- or points-based system (configurable)

**Features**

- Automatic tracking
- Reward redemption
- Customer visible progress bar

### 4.7 CRM System

Tracks customer behaviour:

- Order frequency
- Favourite meals
- Spending habits
- Last visit
- Lifetime value

**Segmentation examples:**

- VIP customers
- inactive customers
- high-frequency customers
- high-spend customers

### 4.8 Delivery & Pickup

**Pickup**

- Time slot selection
- QR or code verification
- Order status tracking

**Delivery**

- Delivery fee by zone
- Simple address capture
- Status updates

*(No complex logistics in pilot phase)*

### 4.9 Dashboard (Owner View)

The dashboard is NOT decorative.

It answers business questions.

**Key Metrics:**

- Revenue today
- Orders today
- Active customers
- Inventory health
- Low stock alerts
- Most popular meals
- Profit estimate (future-ready)

### 4.10 Reporting System

- Daily summary
- Weekly performance
- Monthly trends
- Customer behaviour
- Inventory usage

## 5.0 Business Rules

### 5.1 Order Rules

- Cannot modify order after confirmation
- Must pass inventory validation (future enhancement)
- Must always belong to tenant
- Must be traceable

### 5.2 Inventory Rules

- Cannot be negative (unless explicitly allowed)
- All deductions must be recipe-driven or manual adjustment
- Every change must be logged

### 5.3 Menu Rules

- Only active meals visible to customers
- Options must belong to option groups
- Prices can be additive or base-modified

### 5.4 Loyalty Rules

- Loyalty must always be deterministic
- No manual manipulation without audit log
- Must be tied to customer identity

## 6.0 Customer Experience Principles

The customer experience must be:

- Fast (under 30 seconds to order)
- Minimal friction
- Mobile-first
- Predictable
- Repeat-friendly

**Core UX principle:**

> "Ordering food should feel easier than texting someone."

## 7.0 Business Owner Experience Principles

The owner experience must be:

- Insight-driven
- Not overwhelming
- Actionable
- Real-time where needed

**Core UX principle:**

> "Every screen should help answer a business question."

## 8.0 Differentiation from Generic Systems

KhayaOS is NOT:

- Uber Eats clone
- POS system
- Generic ordering system

KhayaOS IS:

- Inventory-driven business engine
- Customer intelligence system
- Food production tracking system
- Operational control system

## 9.0 MVP Scope (Pilot)

**The pilot includes:**

- Menu configuration
- Orders
- Kitchen display
- Inventory tracking
- CRM
- Loyalty
- Dashboard
- Notifications
- Basic delivery + pickup

**Excludes (but architected):**

- Accounting
- Payroll
- Supplier portal
- Multi-branch management
- AI forecasting
- Driver logistics
- Franchise system

## 10.0 Success Criteria (Pilot)

The pilot is successful if:

- Orders are processed without manual intervention
- Inventory reflects reality within 95%+ accuracy
- Owner can understand daily profit trends
- Customers reorder easily
- Kitchen workflow is smooth under load
- System is stable under daily usage
