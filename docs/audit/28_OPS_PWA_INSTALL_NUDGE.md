# Ops PWA install nudge

Kitchen owners who still run KhayaOS Ops in a browser are reminded to install the Ops PWA.

## In-app (browser only)

- Starts after Ops login when display-mode is not standalone.
- First popup at **60s**, then every **300s** until install (or the device is already marked installed).
- Applies to existing and new tenant staff on `/ops/*`.

## Email + WhatsApp

Same branded copy as `WelcomeOwnerMail` heading/footer.

- **New kitchens:** queued **300s** after registration.
- **Existing owners** with no staff `pwa_installed_at`: **480s** after VPS deploy via `php artisan ops-pwa:schedule-existing-nudges` (idempotent wave `existing_owners_v1`).
