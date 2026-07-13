# Engagement Messaging, Likes & Reviews — Release Report

**Module:** Engagement  
**Feature keys:** `platform_tenant_push`, `platform_tenant_email`, `platform_tenant_chat`, `tenant_customer_chat`, `menu_likes_refer`, `kitchen_reviews`  
**Status:** Production-ready  
**Date:** 2026-07-13

## Summary

Ships complete platform↔tenant push/email/chat, tenant↔customer chat (push extended), menu likes + WhatsApp refer, kitchen reviews with owner moderation and menu footer ticker, and Super Admin plan/staff delegation — all behind existing entitlement and audit patterns.

## Capability checklist

| # | Capability | Status |
|---|------------|--------|
| 1 | Push: platform ↔ tenants | ✓ |
| 2 | Email: platform ↔ tenants | ✓ |
| 3 | In-app chat: Platform Owner/Admin/Support ↔ tenants | ✓ |
| 4 | Push: tenants ↔ customers (extended) | ✓ |
| 5 | In-app chat: tenants ↔ customers | ✓ |
| 6 | Menu likes + WhatsApp refer modal | ✓ |
| 7 | Kitchen reviews → owner approve/reject → footer ticker | ✓ |
| 8 | Super Admin delegates via plan entitlements (+ staff roles) | ✓ |

## Deploy Steps (VPS)

```bash
cd /www/wwwroot/khayaos.prohost.cloud
git -c safe.directory=/www/wwwroot/khayaos.prohost.cloud pull origin main
git -c safe.directory=/www/wwwroot/khayaos.prohost.cloud log -1 --oneline
cd backend && /www/server/php/83/bin/php artisan migrate --force
cd ../frontend && npm run build
pm2 restart khayaos-frontend khayaos-queue khayaos-reverb
```

## Verification

```bash
cd backend && php artisan test
cd ../frontend && npm run build
```

## Related docs

- `docs/audit/18_ENGAGEMENT_FEATURES_IMPLEMENTATION_REPORT.md`
- `docs/audit/19_ENGAGEMENT_FEATURES_QA_REPORT.md`
