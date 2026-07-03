# KhayaOS Phase 1 Pilot — PWA Report

**Audit date:** 2026-07-03  
**Customer app path:** `frontend/app/(customer)/`

---

## Checklist Summary

| Requirement | Status | Notes |
|-------------|--------|-------|
| Web manifest | 🟡 Partial | Present, minimal icons |
| Service worker | 🟡 Partial | Hand-written `sw.js` |
| Installability | 🟡 Partial | Meets basic criteria; weak icons |
| Offline support | 🟡 Partial | Page cache + offline route |
| Background sync | ❌ Missing | Not implemented |
| Push notifications | ❌ Missing | SW handler exists; subscription broken |
| Cache strategy | 🟡 Partial | Network-first GET |
| Icons | 🟡 Partial | Single SVG only |
| Splash screen | ❌ Missing | No dedicated assets |
| Version updates | 🟡 Partial | Cache name bump manual |
| Offline fallback | ✅ Present | `/offline` page |

---

## Manifest

**File:** `frontend/public/manifest.json`

```json
{
  "name": "Khaya Kitchen",
  "short_name": "Khaya",
  "start_url": "/menu",
  "display": "standalone",
  "orientation": "portrait-primary",
  "theme_color": "#0F0F10",
  "icons": [{ "src": "/icon.svg", "sizes": "any", "type": "image/svg+xml" }]
}
```

**Linked from:** `frontend/app/layout.tsx` (`metadata.manifest`)

| Check | Result |
|-------|--------|
| `name` / `short_name` | ✅ |
| `start_url` | ✅ `/menu` |
| `display: standalone` | ✅ |
| `theme_color` / `background_color` | ✅ |
| PNG icons 192, 512 | ❌ |
| `maskable` purpose icons | ❌ (SVG claims maskable — insufficient for all Android launchers) |
| `scope` | ❌ Not set (defaults to origin) |
| `categories` | ❌ |
| `shortcuts` | ❌ |

**Installability (Chrome criteria):**
- HTTPS required in production ✅ (deployment dependent)
- SW registered ✅
- Manifest linked ✅
- Icons — **may fail** strict install prompt on some Android devices

---

## Service Worker

**File:** `frontend/public/sw.js`  
**Registration:** `frontend/components/customer/PwaRegister.tsx`  
**Scope:** Customer layout only (`app/(customer)/layout.tsx`)

### Implemented handlers

| Event | Behavior |
|-------|----------|
| `install` | Pre-cache `/offline`, `/manifest.json`, `/icon.svg` |
| `activate` | Delete old caches (`khaya-kitchen-v1`) |
| `fetch` (GET) | Network-first; cache `/menu*` HTML on success; fallback cache/offline |
| `push` | Show notification with title/body |
| `notificationclick` | Open `/tracking` |

### Not implemented

- Background Sync API
- Periodic sync
- API JSON caching (`/api/v1/menu` bypassed — SW skips `/api/*`)
- IndexedDB for menu/customer data
- `skipWaiting` + client notification for updates (skipWaiting yes, no UI prompt)

**Workbox:** ❌ Not used (vanilla SW)

---

## Installability

| Factor | Status |
|--------|--------|
| SW on customer routes | ✅ |
| Manifest | ✅ |
| Valid icons | 🟡 |
| Custom install prompt | ❌ |
| `beforeinstallprompt` handler | ❌ |

---

## Offline Support

| Asset | Offline available |
|-------|-------------------|
| `/offline` page | ✅ Pre-cached |
| `/menu` HTML shell | 🟡 If previously visited |
| Menu API data | ❌ |
| Branding/storefront | ❌ |
| Cart | ✅ Zustand persist `khayaos-cart` |
| Customer profile | ❌ |
| Order history | ❌ |
| Place order | ❌ |

**Offline page:** `frontend/app/offline/page.tsx` — static message, link home.

**Offline banner:** ❌ No live connection indicator on customer app (admin has `ReconnectingIndicator` for WS only).

---

## Background Sync

**Status:** ❌ **Not implemented**

Failed order POSTs are not queued for retry when connectivity returns.

---

## Push Notifications

| Component | Status |
|-----------|--------|
| SW `push` handler | ✅ |
| `Notification.requestPermission()` | ✅ in opt-in prompt |
| `pushManager.subscribe()` | ❌ `applicationServerKey: undefined` |
| Backend Web Push | ❌ Stub only |
| Order status push | ❌ Not wired end-to-end |

**File:** `frontend/components/customer/NotificationOptInPrompt.tsx` line 47

---

## Cache Strategy

| Request type | Strategy |
|--------------|----------|
| Same-origin GET (non-API) | Network-first → cache → `/offline` |
| `/menu*` pages | Cache on successful network response |
| `/api/*` | **Not intercepted** (pass-through) |
| Cross-origin | Not intercepted |
| POST/PUT/PATCH | Not cached |

**Assessment:** Appropriate for static shell; insufficient for API-heavy PWA.

---

## Icons & Splash

| Asset | Path | Status |
|-------|------|--------|
| SVG icon | `/icon.svg` | ✅ |
| Apple touch icon | Not explicit | 🟡 Relies on manifest |
| 192x192 PNG | — | ❌ |
| 512x512 PNG | — | ❌ |
| Splash screens | — | ❌ |

**Customer theme:** `themeColor` overridden in customer layout to `#0F0F10`.

---

## Version Updates

| Mechanism | Status |
|-----------|--------|
| Cache busting | Manual `CACHE_NAME` string change |
| `skipWaiting()` | ✅ On install |
| User prompt to reload | ❌ |
| `controllerchange` listener | ❌ |

Stale SW may serve old cached `/menu` HTML until cache name bumped.

---

## PWA Registration Scope

- ✅ Registered only on customer routes (correct — admin doesn't need SW)
- ❌ Admin/kitchen not installable as separate PWA (acceptable)

---

## Apple Web App

**Root layout:** `appleWebApp.capable: true`  
**Status:** Basic iOS home screen support; no dedicated apple-touch-icon PNG.

---

## Recommendations (Priority)

| # | Action |
|---|--------|
| 1 | Generate 192/512 maskable PNG icons; update manifest |
| 2 | Cache `GET /menu` JSON in IndexedDB via SW or client |
| 3 | Wire VAPID + fix `applicationServerKey` |
| 4 | Add offline/online banner component on customer layout |
| 5 | Implement background sync or order retry queue for POST failures |
| 6 | Add `controllerchange` reload prompt for SW updates |
| 7 | Consider Workbox for maintainable caching strategies |
| 8 | Add manifest `scope` and `id` for multi-tenant clarity |

---

**PWA verdict:** **Needs Improvement** — installable skeleton exists; offline and push value propositions not delivered.
