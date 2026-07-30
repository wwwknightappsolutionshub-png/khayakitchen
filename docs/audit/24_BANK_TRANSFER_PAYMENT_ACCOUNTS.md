# 24 — Bank transfer payment proofs & Accounts module

**Date:** 2026-07-30  
**Status:** Implemented (Phase 1)

## Summary

Customer checkout no longer offers cash. Bank transfer shows tenant bank details, enforces a **240s** wait, then accepts one payment proof (`.png` / `.jpg` / `.pdf`, ≤2MB). Kitchen **Accounts** lists transfer orders and attachments; staff/owner **verify** payment before **Orders** Accept is allowed (API-enforced).

## Customer flow

1. Checkout methods: **Bank transfer** | **Card** (placeholder).
2. Transfer shows Bank Name / Account Name / Account Number from branding.
3. Place order → payment `pending`, order `pending` → `/payment-confirmation?id=…`.
4. Title: *We'd wait for your payment confirmation* + countdown from `proof_wait_started_at`.
5. At 0s: upload + **Paid** → proof stored → redirect to `/tracking`.
6. Card orders skip wait/proof and go straight to tracking (payment marked `paid`).

## Kitchen flow

1. **Branding**: set bank details (owner/manager).
2. **Accounts** (`/accounts`): Order No, meals, qty/total/time, channel, attachment; link to Orders; **Verify payment**.
3. **Orders**: Accept disabled for unverified transfers; link to Accounts. Reject still allowed.

## Backend

- Migration `2026_07_30_100000_bank_transfer_payment_proofs.php`
- `PaymentAccountsService` — list, upload (wait gate), verify, accept gate
- Routes: `POST /customer/orders/{id}/payment-proof`, `GET /accounts`, `POST /accounts/{orderId}/verify`
- Branding fields: `bank_name`, `bank_account_name`, `bank_account_number` (exposed on storefront)

## QA

- `BankTransferPaymentAccountsTest`
- Existing customer order tests use `card` instead of removed `cash`
- `php artisan test` / `npm run build`
