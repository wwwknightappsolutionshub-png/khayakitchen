# Revenue Recovery Module — Implementation Report

**Date:** 2026-07-05  
**Scope:** Food waste / revenue recovery campaigns integrated into KhayaOS

## Summary

Implemented end-to-end **Revenue Recovery** module extending existing promotion, notification, ordering, and analytics infrastructure.

## Backend

| Area | Implementation |
|------|----------------|
| Table | `revenue_recovery_campaigns` |
| Order tracking | `orders.discount_total`, `orders.revenue_recovery_campaign_id`, `order_items.discount_amount` |
| Services | `RevenueRecoveryCampaignService`, `RevenueRecoveryPricingService` |
| Checkout | `OrderService` applies campaign + promo_mode discounts server-side |
| Storefront | `GET /storefront` includes `revenue_recovery.offers` |
| Notifications | `DeliverRevenueRecoveryNotificationJob` reuses push/WhatsApp + audience resolver |
| Automation | `revenue-recovery:process-schedule` every minute (activate scheduled, expire ended) |
| Feature | `revenue_recovery` plan entitlement + RBAC permissions |
| Tests | `tests/Feature/RevenueRecoveryTest.php` |

## Frontend

| Area | Implementation |
|------|----------------|
| Admin | `/revenue-recovery` dashboard + campaign CRUD/lifecycle |
| Sidebar | Gated by `revenue_recovery` feature flag |
| Customer | `RevenueRecoveryOffersSection`, discounted cart/checkout display |
| PWA | Push deep-links to `/menu?campaign={id}` |

## API Routes

- `GET /revenue-recovery/dashboard`
- `GET|POST /revenue-recovery/campaigns`
- `GET|PATCH|DELETE /revenue-recovery/campaigns/{id}`
- Lifecycle: `/duplicate`, `/activate`, `/pause`, `/resume`, `/deactivate`, `/archive`, `/notify`

## Deploy

```bash
cd /www/wwwroot/khayaos.prohost.cloud
git -c safe.directory=/www/wwwroot/khayaos.prohost.cloud pull origin main
cd backend && /www/server/php/83/bin/php artisan migrate --force
cd ../frontend && npm run build
pm2 restart khayaos-frontend khayaos-queue khayaos-reverb
```

Add Laravel scheduler cron on VPS if not present: `* * * * * php artisan schedule:run`
