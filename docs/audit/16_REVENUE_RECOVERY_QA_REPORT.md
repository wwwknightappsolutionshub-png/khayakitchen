# Revenue Recovery — QA Report

## Tests Executed

| Suite | Command | Result |
|-------|---------|--------|
| Backend PHPUnit (full) | `php artisan test` | See release report |
| Revenue Recovery | `php artisan test --filter=RevenueRecoveryTest` | **5 passed** |
| Frontend production build | `npm run build` | See release report |

---

## Tests Passed

### Backend (RevenueRecoveryTest)
- ✓ Owner can create, activate, and apply campaign discount at checkout
- ✓ Owner can duplicate campaign
- ✓ Public track-open endpoint increments `notifications_opened`
- ✓ Order metrics: one redemption per order, discounted item quantity tracked
- ✓ Dashboard reports open-based order rate and discounted meals sold

### Customer UX
- ✓ Menu cards show discount badge and strikethrough pricing when offer active
- ✓ Featured meal wired to recovery/promo offers
- ✓ Cart, checkout, and order tracking show savings breakdown
- ✓ Campaign deep link (`/menu?campaign=`) records notification open once per session

### Admin UX
- ✓ Campaign type presets (Closing Soon, Happy Hour, Slow Period)
- ✓ UpgradeLimitModal on promotion limit errors
- ✓ Dashboard KPIs: opens, open rate, order rate (opens), discounted meals sold

---

## QA Checklist

| Item | Status |
|------|--------|
| Build passes | ✓ |
| PHPUnit passes | ✓ |
| No partial category targeting exposed | ✓ |
| Notification open tracking | ✓ |
| Metrics definitions aligned | ✓ |
| Promo mode counts toward promotion limit | ✓ |
| Scheduler command registered | ✓ |

---

## Remaining Risks

1. **VPS cron** — `schedule:run` must run every minute on production for campaign auto-activate/expire.
2. **Multi-campaign orders** — Primary campaign attribution on order header when basket spans multiple campaigns (documented limitation).
3. **Promo mode analytics** — Restaurant status promos apply at checkout but are not counted in recovery campaign metrics (by design).
