# 03-ui-design-system.md

## 1.0 Design Philosophy

KhayaOS UI is not a restaurant app UI.

It is a Business Operating System interface.

The goal is to feel:

- premium
- calm
- structured
- data-driven
- fast
- intentional

Not:

- playful food app
- marketplace UI
- POS system UI

## 2.0 Visual Identity

### 2.1 Typography

**Primary font:**

Anek (Anek Latin / Anek Bangla style family preferred)

**Secondary font:**

Inter (UI fallback / system clarity)

**Monospace:**

IBM Plex Mono (numbers, analytics, inventory values)

### 2.2 Typography Rules

- Headings = Anek (semi-bold to bold)
- Body text = Inter (regular)
- Numbers (KPIs, dashboards) = monospace style
- No mixed font chaos
- Maximum 2 fonts per screen

## 3.0 Color System

The design is inspired by African culinary warmth + modern enterprise SaaS clarity.

### 3.1 Core Palette

| Token | Color | Hex |
|-------|-------|-----|
| Background | Midnight Charcoal | `#121418` |
| Surface | Deep Slate | `#1B1F26` |
| Primary Accent | Burnt Copper | `#C46A3C` |
| Secondary Accent | Palm Green | `#2E6F4E` |
| Highlight | Soft Gold | `#D6B46D` |
| Warning | Jollof Orange | `#E07A3F` |
| Neutral | Baobab Beige | `#E6D5B8` |
| Text Primary | Off White | `#F5F5F5` |
| Text Muted | Soft Grey | `#9AA4B2` |

### 3.2 Usage Rules

- Background must remain dark (enterprise feel)
- Accent colors used sparingly
- Red/green never overly saturated
- Avoid rainbow UI patterns
- Status colors must be consistent across system

## 4.0 Layout Philosophy

### 4.1 Grid System

- 12-column grid (desktop)
- 4-column grid (mobile)
- 8px spacing system

### 4.2 Spacing Rules

| Size | Use |
|------|-----|
| 4px | micro spacing |
| 8px | base unit |
| 16px | small layout spacing |
| 24px | section spacing |
| 32px | large separation |
| 48px | major layout break |

## 5.0 UI Personality

The system should feel:

- calm under pressure
- structured under load
- predictable in flow
- responsive in real time

No chaotic movement.

No unnecessary animation.

Motion should be functional, not decorative.

## 6.0 Component Philosophy

Every component must be:

- reusable
- composable
- theme-aware
- state-driven

No one-off UI elements.

### 6.1 Core Components

**Buttons**

- Primary (Copper)
- Secondary (Slate)
- Danger (Orange-red)
- Ghost (transparent)

**Rules:**

- no gradient buttons
- no animated rainbow buttons
- hover states must be subtle

**Cards**

Used everywhere:

- Orders
- Inventory items
- Customers
- KPIs

**Rules:**

- soft shadow only
- rounded corners (12–16px)
- consistent padding
- no visual clutter

**Tables**

Used for:

- inventory logs
- reports
- CRM lists

**Rules:**

- sticky headers
- row hover highlight
- minimal borders
- strong alignment discipline

**Modals**

**Rules:**

- used for critical actions only
- no deep nesting
- always ESC dismissible
- mobile fullscreen fallback

## 7.0 Dashboard Design System

### 7.1 Principle

Dashboard is NOT decorative.

It is:

> "A decision-making interface"

### 7.2 Layout Structure

**Top Row:**

- Revenue
- Orders
- Profit Estimate
- Inventory Health

**Middle:**

- Trends
- Alerts
- Low Stock Items

**Bottom:**

- Customer Activity
- Meal Performance
- Waste Tracking

### 7.3 KPI Cards

Each KPI card must include:

- value
- delta change
- context label
- subtle trend indicator

No unnecessary graphics.

## 8.0 Customer App UI (PWA)

### 8.1 Design Goal

- extremely fast ordering
- minimal cognitive load
- one-thumb navigation

### 8.2 Layout

```
Home → Menu → Customize → Checkout → Tracking
```

No deep navigation trees.

### 8.3 Ordering UI Rules

- large touch targets
- step-by-step flow
- no cluttered menus
- persistent cart summary
- always visible "Continue" CTA

## 9.0 Admin UI (Business System)

### 9.1 Design Goal

- dense but structured
- information-rich
- keyboard-friendly (future)
- dashboard-first

### 9.2 Navigation

**Left sidebar:**

- Dashboard
- Orders
- Kitchen
- Inventory
- Customers
- CRM
- Loyalty
- Reports
- Settings

**Future (locked):**

- Accounting 🔒
- Forecasting 🔒
- HR 🔒

## 10.0 Motion Design Rules

Motion is minimal and purposeful.

**Allowed:**

- fade-in
- slide-in (subtle)
- loading skeletons
- status transitions

**Not allowed:**

- bouncing animations
- excessive transitions
- playful effects

## 11.0 Status System Design

All system statuses must be visually consistent:

| Status | Color |
|--------|-------|
| Pending | Amber |
| Preparing | Blue/Copper blend |
| Ready | Green accent |
| Completed | Neutral grey |
| Cancelled | Muted red |

Same status colors across:

- orders
- inventory
- notifications
- CRM tags

## 12.0 Data Visualization Rules

Charts must be:

- simple
- readable at a glance
- not over-designed

**Preferred:**

- line charts (trends)
- bar charts (comparison)
- heatmaps (usage patterns)

**Avoid:**

- 3D charts
- excessive gradients
- unnecessary animations

## 13.0 Mobile First Principle

Everything must degrade gracefully:

- desktop → full dashboard
- tablet → condensed panels
- mobile → priority actions only

## 14.0 Accessibility Rules

- high contrast text
- minimum 4.5:1 ratio
- large touch targets
- keyboard navigation ready (admin side)
- screen reader labels for key actions

## 15.0 UI Consistency Rule

If a component exists:

- it must be reused everywhere
- it must not be recreated differently elsewhere

**Example:**

- one "Order Card"
- one "Inventory Row"
- one "Customer Card"

No duplicates.

## 16.0 UI Identity Summary

KhayaOS UI should feel like:

- Stripe (clarity)
- Linear (structure)
- Notion (flexibility)
- Apple (polish)
- African culinary warmth (identity)

But never feel like:

- Uber Eats
- Deliveroo
- POS systems
- restaurant ordering apps
