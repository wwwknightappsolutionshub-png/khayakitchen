# Loyalty redeem voucher

Customer “Redeem my points” / package claim now creates a **pending kitchen voucher** instead of silently deducting balance.

## Flow

1. Customer requests a reward (points amount or completed package).
2. Points/stamps are held immediately; a 6-character code is shown on Account.
3. Kitchen (KDS) and Loyalty ops see the pending ticket and tap **Fulfil** or **Decline**.
4. Fulfil confirms the reward (balance stays deducted). Decline/cancel/expiry refunds the hold.

TTL: 24 hours. One pending voucher per customer.

## API (additive)

- `POST /customer/loyalty/redeem` — `{ points }` or `{ package_id }` → `{ voucher, loyalty }`
- `POST /customer/loyalty/vouchers/{id}/cancel`
- `GET /loyalty/vouchers`, `POST /loyalty/vouchers/{id}/fulfil|cancel`
- `GET /kitchen/loyalty-vouchers`, `POST /kitchen/loyalty-vouchers/{id}/fulfil|cancel` (kitchen.view)

Staff `POST /loyalty/redeem` remains an immediate counter deduct (no voucher).
