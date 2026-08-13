# Voice order through checkout

Customer Voice Order Assistant (Home + Menu) is a full spoken checkout, not cart-only.

1. Meal name match (optional leading quantity: “two jollof”)
2. Confirm → quantity if unknown → each option group (single required; extras can be “none”)
3. Add to existing cart → “anything else?” or checkout
4. Pickup or delivery (address if delivery) → ASAP or spoken time
5. Name + phone (stored customer defaults reused)
6. Bank transfer or card (same kitchen bank-detail rule as `/checkout`)
7. Recap → “send the order” → `POST /customer/orders` then tracking or payment confirmation
