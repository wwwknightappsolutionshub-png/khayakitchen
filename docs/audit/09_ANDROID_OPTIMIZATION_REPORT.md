# KhayaOS Phase 1 Pilot — Android Optimization Report

**Audit date:** 2026-07-03  
**Target device profile:** Ultra-light Android phones (primary business + customer device for pilot canteen)

This report assesses current state vs audit requirements. **Optimization has NOT been implemented** — findings only.

---

## Executive Summary

| Category | Current State | Target | Gap |
|----------|---------------|--------|-----|
| Bundle size | Default Next.js splits | Lazy admin modules | ❌ |
| Image optimization | Partial `next/image` | WebP/AVIF + sizes | 🟡 |
| List virtualization | None | Long order lists | ❌ |
| Skeleton loading | Partial | All data views | 🟡 |
| Optimistic updates | None | Cart/checkout | 🟡 |
| Memoization | Minimal | Heavy lists | 🟡 |
| WebSocket payloads | Full events | Delta-only | ❌ |
| Background polling | Fixed intervals | Reduced when hidden | ❌ |
| Bottom navigation | Built, not mounted | One-handed use | ❌ |
| Offline cache | Cart only | Menu + branding | ❌ |
| Battery optimization | Not addressed | Reduced timers/WS | ❌ |
| Accessibility | Partial | Contrast, zoom, SR | 🟡 |

**Overall:** **Not optimized** for ultra-light Android. Requires implementation pass after Critical/High fixes.

---

## Performance

### JavaScript bundle

| Check | Finding |
|-------|---------|
| `next/dynamic` / `React.lazy` | ❌ **None found** |
| Route-based splitting | ✅ Next.js App Router automatic per-page |
| Admin + Reports + Inventory + Analytics loaded | 🟡 Separate routes but no explicit lazy boundaries |
| Shared vendor chunk | Default bundling — not analyzed (no bundle analyzer in CI) |

**Required lazy load targets (not implemented):**
- `app/(admin)/reports/page.tsx`
- `app/(admin)/inventory/page.tsx`
- `app/(admin)/marketing/page.tsx`
- `app/(platform)/platform/pricing/page.tsx`
- Heavy chart components (reports uses CSS bars only — low weight)

**Recommendation:**
```tsx
const ReportsPage = dynamic(() => import('./ReportsContent'), { loading: () => <ReportsSkeleton /> });
```

### Image optimization

| Component | Implementation |
|-----------|----------------|
| `MealImage.tsx` | `next/image` with sizes |
| `PromoModal.tsx` | `next/image` |
| `CustomerHeader.tsx` | Raw `<img>` for tenant logo (ESLint exception) |
| WebP/AVIF | ❌ Relies on Next.js optimizer + remote CDN sources |
| Responsive srcset | 🟡 Limited `sizes` props |

**Remote patterns:** Unsplash, Pexels only in `next.config.ts`

### Virtualization

| List | Virtualized |
|------|-------------|
| Admin orders table | ❌ Renders all rows |
| Kitchen orders | ❌ Card list, all items |
| CRM customer table | ❌ |
| Live orders feed | ❌ |

**Library:** None (`@tanstack/react-virtual` not in package.json)

### Skeleton loading

| Screen | Skeleton |
|--------|----------|
| Menu | ✅ `MenuSkeleton` + Suspense |
| Tracking | ✅ Suspense skeleton |
| Dashboard | 🟡 `LoadingSkeleton` in feeds |
| Inventory | ✅ `TableRowSkeleton` |
| CRM/Orders | ✅ Table row skeletons |
| Checkout | ❌ |

### Optimistic updates

| Action | Optimistic UI |
|--------|---------------|
| Add to cart | ✅ Instant (Zustand) |
| Place order | ❌ Waits for server |
| Kitchen status update | ❌ Waits for mutation |
| Status badges | ❌ |

### Re-renders / memoization

- Zustand selectors used appropriately in cart
- `useRealtimeEvent` invalidates React Query broadly — may over-refetch
- No `React.memo` on heavy list item components
- Kitchen page re-renders on each poll

### WebSocket payloads

**Backend:** `RealtimeMessage` broadcasts full event payloads — no delta/diff compression.

**Frontend:** `RealtimeProvider` invalidates entire query keys on events — not field-level merge.

### Polling frequency

| Location | Interval | Background aware |
|----------|----------|------------------|
| Kitchen | 4–5s when WS down | ❌ |
| `useHybridInterval` | Disables when WS up | ✅ |
| Dashboard live feed | Hybrid | 🟡 |
| Customer tracking | React Query default | ❌ No visibility API |

**Missing:** `document.visibilityState` / Page Visibility API to slow polling when backgrounded.

### Reconnect behavior

- `realtime-client.ts`: exponential backoff to 30s cap ✅
- No circuit breaker for battery save mode

### Failed request queue

❌ Not implemented in `api-client.ts`

---

## Mobile-First UX

### Layout audit by viewport

Reviewed Tailwind usage for **320, 360, 390, 412, 480px** (default breakpoints + `max-w-lg` = 512px customer shell).

| Screen | 320px | Issues |
|--------|-------|--------|
| Customer home/menu | ✅ `max-w-lg`, px-4 | Adequate |
| Checkout form | ✅ Full-width inputs `h-11` | Touch OK |
| Cart | ✅ | Adequate |
| Admin dashboard | 🟡 KPI grid stacks | Sidebar hidden on mobile? Check Sidebar |
| Kitchen | ✅ `min-h-12` buttons | Good |
| Platform | 🟡 Tables overflow-x | Horizontal scroll |

### Touch targets

| Element | Size | WCAG 44px |
|---------|------|-----------|
| `CustomerButton` lg | `h-12` (48px) | ✅ |
| `CustomerButton` md | `h-11` (44px) | ✅ |
| `CustomerInput` | `h-11` | ✅ |
| Kitchen status buttons | `min-h-12` | ✅ |
| Admin filter chips | `py-1.5` | 🟡 ~32px — borderline |
| CustomerNav (unused) | `min-w-[64px]` py-2 | 🟡 If mounted, verify 44px height |

### Bottom navigation

| Requirement | Status |
|-------------|--------|
| Bottom nav component | ✅ Built `CustomerNav.tsx` |
| Mounted in layout | ❌ **Not imported** |
| Thumb reach primary actions | 🟡 `StickyCartBar` provides bottom CTA |
| Safe area insets | ✅ `safe-area-pb` in CSS |

### Typography

- Customer: `text-2xl` headings, `text-sm` body — readable
- Admin: `text-2xl` page titles — OK
- No user-adjustable font scaling (OS scaling blocked by `maximumScale: 1`)

### Scrolling / typing

- Checkout: minimal fields (name, phone, address) ✅
- Meal customization: bottom sheet ✅
- Admin inventory: wide table requires horizontal scroll on 320px 🟡

### Dashboard cards

- `sm:grid-cols-2 xl:grid-cols-4` — stacks vertically on mobile ✅

### Transitions / effects

- `customer-press:active` scale — light ✅
- `backdrop-blur` on sticky bars — **GPU cost** on low-end devices 🟡
- No heavy gradients in customer flow ✅

---

## Offline Experience (Android)

| Data | Cached |
|------|--------|
| Menu JSON | ❌ |
| Branding/storefront | ❌ |
| Customer profile | ❌ |
| Order history | ❌ |
| Cart | ✅ localStorage |
| Offline banner | ❌ |
| Auto sync on reconnect | ❌ |
| Retry queue | ❌ |
| Connection indicator | ❌ (customer) |

---

## Battery Optimization

| Source | Impact | Mitigation status |
|--------|--------|-------------------|
| Kitchen 4–5s polling | High when WS down | ❌ |
| WebSocket reconnect loop | Medium | Partial backoff |
| `setTimeout` opt-in prompt 1.2s | Low | — |
| React Query refetch | Low (focus disabled) | ✅ `refetchOnWindowFocus: false` |
| Animations | Low | — |

**Required:** Visibility-based polling reduction, increase intervals when `document.hidden`.

---

## Accessibility (Mobile)

| Check | Status |
|-------|--------|
| Color contrast (dark theme) | 🟡 Not formally measured — visual review suggests adequate |
| Large fonts | ✅ Customer buttons lg |
| Screen readers | 🟡 Partial ARIA on modals |
| Focus order | 🟡 Bottom sheets lack focus trap |
| Keyboard support | 🟡 Mobile-first; forms OK |
| ARIA labels | 🟡 Close buttons labeled; nav links incomplete |
| `maximumScale: 1` | ❌ Blocks pinch-zoom — **fails low-vision** |
| `prefers-reduced-motion` | ❌ Not implemented |

---

## Recommended Implementation Plan (Post-Audit)

### Phase A — Quick wins (1–2 days)
1. Mount `CustomerNav`; remove duplicate header nav links
2. Add `ConnectionBanner` (online/offline) to customer layout
3. `dynamic()` import admin reports, marketing, platform pricing
4. Remove or relax `maximumScale: 1`
5. Increase kitchen poll to 8–10s when `document.hidden`

### Phase B — Performance (2–3 days)
6. Add `@tanstack/react-virtual` to orders + kitchen lists
7. Cache menu/storefront in IndexedDB (react-query persist or custom)
8. Optimistic kitchen status updates with rollback
9. Memoize `OrderRow` / `KitchenCard` components

### Phase C — Network (2 days)
10. API retry queue for failed POST (orders)
11. Compress realtime payloads (send `{ id, status }` only for status changes)
12. WebP images uploaded/served for meal photos

---

## Measurement Baseline (to establish pre-optimization)

Run before/after on representative device (e.g. Redmi 9A class):

| Metric | Tool |
|--------|------|
| LCP on `/menu` | Lighthouse mobile |
| TTI on `/admin/dashboard` | Lighthouse |
| JS bundle size | `@next/bundle-analyzer` |
| Order list scroll FPS | Chrome Performance |
| Battery drain 1hr kitchen open | Manual / Android battery stats |

*No baseline captured in this audit — recommend capturing before optimization sprint.*

---

**Verdict:** Android ultra-light optimization **not started**. Customer UX has good foundations (`h-11`/`h-12` targets, safe areas, bottom sheets) but navigation, offline, bundle, and battery requirements are unmet.
