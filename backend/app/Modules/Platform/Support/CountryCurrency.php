<?php

namespace App\Modules\Platform\Support;

/**
 * ISO 3166-1 alpha-2 → ISO 4217 for tenant money at signup.
 * Country wins over a submitted currency that does not match.
 */
class CountryCurrency
{
    /** @var array<string, string> */
    private const MAP = [
        'AD' => 'EUR', 'AE' => 'AED', 'AF' => 'AFN', 'AG' => 'XCD', 'AI' => 'XCD',
        'AL' => 'ALL', 'AM' => 'AMD', 'AO' => 'AOA', 'AR' => 'ARS', 'AS' => 'USD',
        'AT' => 'EUR', 'AU' => 'AUD', 'AW' => 'AWG', 'AZ' => 'AZN', 'BA' => 'BAM',
        'BB' => 'BBD', 'BD' => 'BDT', 'BE' => 'EUR', 'BF' => 'XOF', 'BG' => 'BGN',
        'BH' => 'BHD', 'BI' => 'BIF', 'BJ' => 'XOF', 'BM' => 'BMD', 'BN' => 'BND',
        'BO' => 'BOB', 'BR' => 'BRL', 'BS' => 'BSD', 'BT' => 'BTN', 'BW' => 'BWP',
        'BY' => 'BYN', 'BZ' => 'BZD', 'CA' => 'CAD', 'CD' => 'CDF', 'CF' => 'XAF',
        'CG' => 'XAF', 'CH' => 'CHF', 'CI' => 'XOF', 'CL' => 'CLP', 'CM' => 'XAF',
        'CN' => 'CNY', 'CO' => 'COP', 'CR' => 'CRC', 'CU' => 'CUP', 'CV' => 'CVE',
        'CY' => 'EUR', 'CZ' => 'CZK', 'DE' => 'EUR', 'DJ' => 'DJF', 'DK' => 'DKK',
        'DM' => 'XCD', 'DO' => 'DOP', 'DZ' => 'DZD', 'EC' => 'USD', 'EE' => 'EUR',
        'EG' => 'EGP', 'ER' => 'ERN', 'ES' => 'EUR', 'ET' => 'ETB', 'FI' => 'EUR',
        'FJ' => 'FJD', 'FK' => 'FKP', 'FM' => 'USD', 'FR' => 'EUR', 'GA' => 'XAF',
        'GB' => 'GBP', 'GD' => 'XCD', 'GE' => 'GEL', 'GF' => 'EUR', 'GG' => 'GBP',
        'GH' => 'GHS', 'GI' => 'GIP', 'GM' => 'GMD', 'GN' => 'GNF', 'GP' => 'EUR',
        'GQ' => 'XAF', 'GR' => 'EUR', 'GT' => 'GTQ', 'GU' => 'USD', 'GW' => 'XOF',
        'GY' => 'GYD', 'HK' => 'HKD', 'HN' => 'HNL', 'HR' => 'EUR', 'HT' => 'HTG',
        'HU' => 'HUF', 'ID' => 'IDR', 'IE' => 'EUR', 'IL' => 'ILS', 'IM' => 'GBP',
        'IN' => 'INR', 'IQ' => 'IQD', 'IR' => 'IRR', 'IS' => 'ISK', 'IT' => 'EUR',
        'JE' => 'GBP', 'JM' => 'JMD', 'JO' => 'JOD', 'JP' => 'JPY', 'KE' => 'KES',
        'KG' => 'KGS', 'KH' => 'KHR', 'KI' => 'AUD', 'KM' => 'KMF', 'KN' => 'XCD',
        'KR' => 'KRW', 'KW' => 'KWD', 'KY' => 'KYD', 'KZ' => 'KZT', 'LA' => 'LAK',
        'LB' => 'LBP', 'LC' => 'XCD', 'LI' => 'CHF', 'LK' => 'LKR', 'LR' => 'LRD',
        'LS' => 'LSL', 'LT' => 'EUR', 'LU' => 'EUR', 'LV' => 'EUR', 'LY' => 'LYD',
        'MA' => 'MAD', 'MC' => 'EUR', 'MD' => 'MDL', 'ME' => 'EUR', 'MG' => 'MGA',
        'MH' => 'USD', 'MK' => 'MKD', 'ML' => 'XOF', 'MM' => 'MMK', 'MN' => 'MNT',
        'MO' => 'MOP', 'MQ' => 'EUR', 'MR' => 'MRU', 'MS' => 'XCD', 'MT' => 'EUR',
        'MU' => 'MUR', 'MV' => 'MVR', 'MW' => 'MWK', 'MX' => 'MXN', 'MY' => 'MYR',
        'MZ' => 'MZN', 'NA' => 'NAD', 'NC' => 'XPF', 'NE' => 'XOF', 'NG' => 'NGN',
        'NI' => 'NIO', 'NL' => 'EUR', 'NO' => 'NOK', 'NP' => 'NPR', 'NZ' => 'NZD',
        'OM' => 'OMR', 'PA' => 'PAB', 'PE' => 'PEN', 'PF' => 'XPF', 'PG' => 'PGK',
        'PH' => 'PHP', 'PK' => 'PKR', 'PL' => 'PLN', 'PR' => 'USD', 'PS' => 'ILS',
        'PT' => 'EUR', 'PY' => 'PYG', 'QA' => 'QAR', 'RE' => 'EUR', 'RO' => 'RON',
        'RS' => 'RSD', 'RU' => 'RUB', 'RW' => 'RWF', 'SA' => 'SAR', 'SB' => 'SBD',
        'SC' => 'SCR', 'SD' => 'SDG', 'SE' => 'SEK', 'SG' => 'SGD', 'SH' => 'SHP',
        'SI' => 'EUR', 'SK' => 'EUR', 'SL' => 'SLL', 'SM' => 'EUR', 'SN' => 'XOF',
        'SO' => 'SOS', 'SR' => 'SRD', 'SS' => 'SSP', 'ST' => 'STN', 'SV' => 'USD',
        'SY' => 'SYP', 'SZ' => 'SZL', 'TC' => 'USD', 'TD' => 'XAF', 'TG' => 'XOF',
        'TH' => 'THB', 'TJ' => 'TJS', 'TL' => 'USD', 'TM' => 'TMT', 'TN' => 'TND',
        'TO' => 'TOP', 'TR' => 'TRY', 'TT' => 'TTD', 'TV' => 'AUD', 'TW' => 'TWD',
        'TZ' => 'TZS', 'UA' => 'UAH', 'UG' => 'UGX', 'US' => 'USD', 'UY' => 'UYU',
        'UZ' => 'UZS', 'VC' => 'XCD', 'VE' => 'VES', 'VG' => 'USD', 'VI' => 'USD',
        'VN' => 'VND', 'VU' => 'VUV', 'WS' => 'WST', 'XK' => 'EUR', 'YE' => 'YER',
        'ZA' => 'ZAR', 'ZM' => 'ZMW', 'ZW' => 'ZWL',
    ];

    /** @var array<string, string> */
    private const NAME_TO_ISO = [
        'united kingdom' => 'GB',
        'united states' => 'US',
        'united states of america' => 'US',
        'nigeria' => 'NG',
        'ghana' => 'GH',
        'kenya' => 'KE',
        'south africa' => 'ZA',
        'canada' => 'CA',
        'australia' => 'AU',
        'ireland' => 'IE',
        'india' => 'IN',
        'united arab emirates' => 'AE',
    ];

    public static function forIso(?string $iso): ?string
    {
        if ($iso === null || trim($iso) === '') {
            return null;
        }

        $key = strtoupper(trim($iso));

        return self::MAP[$key] ?? null;
    }

    public static function forCountryName(?string $name): ?string
    {
        if ($name === null || trim($name) === '') {
            return null;
        }

        $iso = self::NAME_TO_ISO[strtolower(trim($name))] ?? null;

        return $iso ? self::forIso($iso) : null;
    }

    /**
     * Country ISO (then country name) wins. Submitted currency is used only when
     * the country has no mapping.
     */
    public static function resolve(?string $countryIso, ?string $countryName, ?string $submitted): string
    {
        $fromIso = self::forIso($countryIso);
        if ($fromIso) {
            return $fromIso;
        }

        $fromName = self::forCountryName($countryName);
        if ($fromName) {
            return $fromName;
        }

        $code = strtoupper(trim((string) $submitted));
        if (preg_match('/^[A-Z]{3}$/', $code) === 1) {
            return $code;
        }

        return 'GBP';
    }
}
