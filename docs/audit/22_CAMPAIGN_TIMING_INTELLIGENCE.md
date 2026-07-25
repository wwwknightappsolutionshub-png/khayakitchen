# 22 — Campaign Timing Intelligence (Phase 1)

**Date:** 2026-07-25  
**Status:** Implemented

## Summary

KhayaOS learns each tenant’s completed-order rhythm (weekday × hour in the tenant timezone) over a configurable lookback (default 42 days), persists a `tenant_sales_rhythm_summaries` row, and auto-writes **Campaign tips** into `platform_tenant_messages` with `channel=suggestion` (separate from Super Admin push/email).

## Peak / off-peak rule

Among weekday×hour cells with count ≥ `min_cell_orders` (default 2):

- **Peak** = count ≥ 75th percentile of those positive cell counts  
- **Off-peak** = count ≤ 25th percentile (and not also peak)

Contiguous peak hours on the same weekday merge into labeled windows (e.g. `Fri 17:00–19:00`). Suggestions fire when local time is inside a peak window or within `pre_peak_minutes` (default 45) before it starts. Off-peak tips are optional when the current hour is quiet. Max **1 suggestion per tenant per local day**.

## Feature gate

- Key: `campaign_timing_intelligence`  
- Plan: **Growth+** (PricingSeeder)  
- Schedule: `campaign-timing:process-suggestions` every 30 minutes  

## Surfaces

- Tenant Inbox → **Campaign tips** card + Create campaign CTA → `/marketing`  
- Manual Platform notifications remain push/email only  

## QA

- PHPUnit: `CampaignTimingIntelligenceTest`  
- Frontend: `npm run build`
