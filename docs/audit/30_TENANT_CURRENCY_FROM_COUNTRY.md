# Tenant currency from country

Kitchen money follows the country chosen at signup. Submitted currency is overwritten when a country ISO mapping exists (`NG` → `NGN`).

- Backend: `App\Modules\Platform\Support\CountryCurrency`
- Frontend: `currencyForCountryIso` / `resolveSignupCurrency` in `lib/currencies.ts`
- Tenant `formatCurrency` no longer falls back to GBP; menu/inventory labels use the workspace symbol
- Platform SaaS pricing (`/ops/pricing`, MRR) remains GBP
