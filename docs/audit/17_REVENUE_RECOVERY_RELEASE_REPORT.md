# Revenue Recovery — Release Report

**Module:** Revenue Recovery  
**Feature key:** `revenue_recovery`  
**Status:** Production-ready (gap closure complete)

---

## Summary

Revenue Recovery is fully integrated into KhayaOS: tenant campaigns, storefront pricing, checkout discounts, push notifications, admin analytics, and plan limits. This release closes all previously identified partial implementations.

---

## Gap Closure (this release)

| Gap | Resolution |
|-----|------------|
| Checkout / tracking savings | `OrderSavingsSummary` on cart, checkout, order tracking |
| Menu discount badges | `MenuCard` + offer map from storefront |
| Featured meal offers | `FeaturedMealCard` wired to recovery/promo offers |
| Menu add without offer section | `getPromoUnitPrice` applied in customize flow from any entry point |
| Notification open tracking | `POST /storefront/revenue-recovery/campaigns/{id}/track-open` + session dedup |
| Redemption / meals metrics | Per-order redemptions; `discounted_items_sold`; open-based order rate |
| Campaign type presets | Form presets for Closing Soon, Happy Hour, Slow Period |
| UpgradeLimitModal | Shown on activate/resume when plan promotion limit hit |
| Promo mode limit | `assertPromotionLimit()` when entering promo_mode |
| Category targeting (partial) | Removed from API surface (meals-only targeting) |

---

## Deploy Steps (VPS)

From `/www/wwwroot/khayaos.prohost.cloud`:

```bash
git -c safe.directory=/www/wwwroot/khayaos.prohost.cloud pull origin main
cd backend && php artisan migrate --force
cd ../frontend && npm ci && npm run build
pm2 restart khayaos-frontend
```

Ensure Laravel scheduler cron is active:

```cron
* * * * * cd /www/wwwroot/khayaos.prohost.cloud/backend && php artisan schedule:run >> /dev/null 2>&1
```

---

## Verification

```bash
cd backend && php artisan test --filter=RevenueRecoveryTest
cd ../frontend && npm run build
```

---

## API Additions

| Method | Path | Auth |
|--------|------|------|
| POST | `/api/v1/storefront/revenue-recovery/campaigns/{id}/track-open` | Tenant header only |

Dashboard fields added: `notifications_opened`, `notification_open_rate`.  
`redemption_rate` = campaign orders ÷ notification opens × 100.

---

## Database

Migration `2026_07_05_020000_add_revenue_recovery_metrics_columns`:
- `notifications_opened`
- `discounted_items_sold`
