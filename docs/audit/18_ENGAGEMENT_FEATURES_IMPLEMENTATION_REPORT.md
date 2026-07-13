# Engagement Messaging, Likes & Reviews — Implementation Report

**Date:** 2026-07-13  
**Scope:** Platform↔tenant messaging/chat, tenant↔customer chat/push extension, menu likes + WhatsApp refer, kitchen reviews + footer ticker, plan entitlements

## Summary

Implemented end-to-end engagement features in module `App\Modules\Engagement`, extending existing push, entitlements, storefront, menu, and admin/platform UI. No parallel notification stacks. Auth login/tenant isolation preserved; platform staff roles added (`platform_admin`, `platform_support`) with Super Admin staff delegation.

## Backend

| Area | Implementation |
|------|----------------|
| Migration | `2026_07_13_044000_engagement_messaging_likes_reviews.php` |
| Models | `PlatformTenantMessage`, `ChatThread`, `ChatMessage`, `MealLike`, `KitchenReview` |
| Services | `PlatformTenantMessagingService`, `ChatService`, `MealLikeService`, `KitchenReviewService` |
| Push | `PushNotificationService::sendToUser()` + staff device token registration |
| Mail | `PlatformToTenantMail` + blade template |
| Feature keys | `platform_tenant_push`, `platform_tenant_email`, `platform_tenant_chat`, `tenant_customer_chat`, `menu_likes_refer`, `kitchen_reviews` |
| Plans | Starter: none of the new keys; Growth: likes/reviews/customer chat; Professional+: platform↔tenant channels |
| Menu | `MenuService::getMenu()` returns `likes_count`, `likes_enabled`, `menu_likes_refer_enabled` |
| Storefront | `review_ticker` from approved kitchen reviews |
| Tests | `tests/Feature/EngagementFeaturesTest.php` (5 tests) |

## Frontend

| Area | Implementation |
|------|----------------|
| Types / API | `lib/types.ts` + `services/engagement.service.ts` |
| Platform | `/platform/inbox`, `/platform/staff`; sidebar Inbox for all platform staff |
| Tenant admin | `/inbox`, `/reviews` |
| Customer | Menu like/refer + `MealReferModal`; `KitchenReviewForm`; `CustomerChatPanel`; `ReviewTicker` footer |
| Auth guards | Platform Owner/Admin/Support; admin redirects platform_admin/support to `/platform/inbox` |

## API Routes (additive)

- `POST/GET /platform/messages`, `/platform/chat/threads*`, `/platform/staff`
- `GET /engagement/platform-messages`, `/engagement/platform-chat/threads`, `/engagement/customer-chat/threads`, `/engagement/chat/threads/{id}`, `/engagement/reviews`
- `POST /customer/meals/{id}/like`, `GET /customer/meals/{id}/refer`, `POST /customer/reviews`, `/customer/chat/threads*`

## Deploy

```bash
cd /www/wwwroot/khayaos.prohost.cloud
git -c safe.directory=/www/wwwroot/khayaos.prohost.cloud pull origin main
git -c safe.directory=/www/wwwroot/khayaos.prohost.cloud log -1 --oneline
cd backend && /www/server/php/83/bin/php artisan migrate --force
cd ../frontend && npm run build
pm2 restart khayaos-frontend khayaos-queue khayaos-reverb
```
