/**
 * Countries where a postal / ZIP code is mandatory during signup: the UK,
 * Canada, and European countries. Everywhere else a postal code is optional.
 *
 * Kept in sync with the backend `PostalCodePolicy` (matched by canonical
 * country name from the `country-state-city` dataset).
 */
export const POSTAL_CODE_REQUIRED_ISO2 = new Set<string>([
  "GB",
  "CA",
  "AL",
  "AD",
  "AT",
  "BY",
  "BE",
  "BA",
  "BG",
  "HR",
  "CY",
  "CZ",
  "DK",
  "EE",
  "FO",
  "FI",
  "FR",
  "DE",
  "GI",
  "GR",
  "GG",
  "HU",
  "IS",
  "IE",
  "IM",
  "IT",
  "JE",
  "LV",
  "LI",
  "LT",
  "LU",
  "MT",
  "MD",
  "MC",
  "ME",
  "NL",
  "MK",
  "NO",
  "PL",
  "PT",
  "RO",
  "RU",
  "SM",
  "RS",
  "SK",
  "SI",
  "ES",
  "SE",
  "CH",
  "UA",
  "VA",
]);

export function isPostalCodeRequired(countryIso2: string | undefined | null): boolean {
  if (!countryIso2) return false;
  return POSTAL_CODE_REQUIRED_ISO2.has(countryIso2.toUpperCase());
}
