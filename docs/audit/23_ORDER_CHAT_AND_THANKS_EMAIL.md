# 23 — In-session order chat & post-completion thanks email

**Date:** 2026-07-27  
**Status:** Implemented

## Feature A — In-session order chat

- `chat_threads.order_id` (nullable) links a tenant↔customer thread to a live order.
- **In session** = `pending | accepted | preparing | ready` (not `completed` / `cancelled` / `undone`).
- `POST /engagement/customer-chat/threads` accepts `order_id` (or `customer_id` + optional `order_id`).
- Opening via completed order returns **422**.
- Inbox: **Active orders** filter (`?active_orders=1`); deep-link `/inbox?thread=…`.
- Orders UI: **Chat** on in-session orders with `customer_id` when `tenant_customer_chat` is enabled.

## Feature B — Thanks email on `completed`

- On first transition to `completed`, existing order-email job sends a richer **thanks** mail with CTAs:
  - Leave a review (`/r/{slug}?review=1` → menu review form)
  - Open account / register
  - Install PWA
  - Loyalty & rewards
- Skips when customer has no email or email opt-out.
- Earlier status emails remain short status updates.

## QA

- `EngagementFeaturesTest` (order chat + isolation)
- `MultiChannelNotificationsAndMealShareTest` (thanks CTAs)
- `npm run build`
