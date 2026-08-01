# 25 — Scoped PWA split (Phase A)

**Date:** 2026-07-31  
**Status:** Complete (P0+P1+P2 partials closed)  
**Post-fix audit:** 2026-07-31 — PASS

## Goal

One Next.js repo, two installable identities:

| Surface | Manifest | `id` | `start_url` | Brand |
|---------|----------|------|-------------|-------|
| **Order (customer)** | `/pwa-manifest/{slug}` | ordering path | `/r/{slug}` | Restaurant name + logo |
| **Ops (kitchen/staff)** | `/manifest-ops.json` | `/ops` | `/ops/login` | KhayaOS Ops (distinct green-shield PNGs) |

## What shipped

- `public/manifest-ops.json` (+ `manifest.json` alias with same Ops identity)
- Distinct Ops icons: `icon-ops.svg`, `icon-ops-192.png`, `icon-ops-512.png`, `apple-touch-icon-ops.png` (SHA-256 ≠ customer PNGs)
- Admin / auth / platform / marketing / pricing / reset-app → Ops manifest + Ops icons via metadata + `OpsPwaManifestLink`
- Customer shell, `/r/[slug]`, `/offline` → customer icons + `TenantPwaManifestLink` (strips Ops manifests)
- Root metadata neutralized (generic KhayaOS / customer icons; route groups override)
- `TenantPwaManifestService`: restaurant name (never “KhayaOS Ops”), Order description, related_applications → tenant manifest
- Install marks: `khayaos_customer_pwa_installed` / `khayaos_ops_pwa_installed`; legacy key migrates **current surface only**
- `PwaInstallPrompt` gated on `detectPwaInstalled("customer")`; marketing + admin + platform install → Ops
- `PwaLifecycle` always registers network-only SW (no unregister on staff routes)
- `WrongSurfaceBanner` for standalone wrong-surface navigation
- `sw.js` surface-aware default notification icon/title (`payload.surface`)
- Login: kitchen → `/ops/kitchen`, floor roles → `/ops/orders`; title “KhayaOS Ops”
- Marketing chrome uses Ops icons

## Phase B follow-up

Path-prefix scopes and dual SWs are delivered in `docs/audit/26_SCOPED_PWA_PHASE_B.md`.

## Partials closed (prior audit → fix)

| Priority | Gap | Resolution |
|----------|-----|------------|
| P0 | Ops PNGs byte-identical to customer | Regenerated distinct Ops 192/512/apple-touch |
| P0 | `PwaInstallPrompt` ignored install mark | Gates on `detectPwaInstalled("customer")` |
| P1 | `/r/[slug]` missing customer identity | `app/r/[slug]/layout.tsx` + `TenantPwaManifestLink` |
| P1 | Root/orphan Ops leakage | Neutral root; offline/customer + pricing/reset-app Ops layouts |
| P1 | `inferPwaSurface` quirks (`/home` ops, `/reset-app` missing) | `/home` customer; `/reset-app`/`/pricing`/`/audit` ops |
| P1 | Legacy migrate marked both surfaces | Credits only current path surface |
| P1 | Marketing customer icons while selling Ops | MarketingShell / chatbot / splash → Ops icons |
| P1 | Staff SW unregister blocked Ops install | Always `registerNetworkOnlyServiceWorker()` |
| P2 | No wrong-surface banner | `WrongSurfaceBanner` in root layout |
| P2 | Platform no install CTA | `AdminPwaInstallNav` in `PlatformSidebar` |
| P2 | Mixed admin install copy | “KhayaOS Ops” throughout |
| P2 | `sw.js` always customer icon | Surface-aware defaults |
| P2 | No Ops manifest contract test | `TenantPwaManifestTest::test_ops_manifest_file_has_distinct_identity` |

## Out of scope (Phase B) — **done**

See `docs/audit/26_SCOPED_PWA_PHASE_B.md` for `/ops/*` prefix, dual SW scopes, and legacy redirects.

## Known Phase A limits (superseded by Phase B)

- Phase B enforces Ops navigation within `/ops/` via manifest + SW scope
- Customer Order scope remains `/` until optional `/r/{slug}/…` nesting