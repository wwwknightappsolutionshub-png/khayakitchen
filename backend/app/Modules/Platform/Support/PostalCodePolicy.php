<?php

namespace App\Modules\Platform\Support;

/**
 * Postal code requirement policy for public signup.
 * UK, Canada, and European countries require a postal code; all others optional.
 */
class PostalCodePolicy
{
    /** @var list<string> Canonical country names from country-state-city dataset */
    private const REQUIRED_COUNTRY_NAMES = [
        'United Kingdom',
        'Canada',
        'Albania',
        'Andorra',
        'Austria',
        'Belarus',
        'Belgium',
        'Bosnia and Herzegovina',
        'Bulgaria',
        'Croatia',
        'Cyprus',
        'Czech Republic',
        'Denmark',
        'Estonia',
        'Faroe Islands',
        'Finland',
        'France',
        'Germany',
        'Gibraltar',
        'Greece',
        'Guernsey and Alderney',
        'Hungary',
        'Iceland',
        'Ireland',
        'Man (Isle of)',
        'Italy',
        'Jersey',
        'Latvia',
        'Liechtenstein',
        'Lithuania',
        'Luxembourg',
        'Malta',
        'Moldova',
        'Monaco',
        'Montenegro',
        'Netherlands',
        'Macedonia',
        'Norway',
        'Poland',
        'Portugal',
        'Romania',
        'Russia',
        'San Marino',
        'Serbia',
        'Slovakia',
        'Slovenia',
        'Spain',
        'Sweden',
        'Switzerland',
        'Ukraine',
        'Vatican City State (Holy See)',
    ];

    public static function isRequired(?string $country): bool
    {
        if ($country === null || trim($country) === '') {
            return false;
        }

        return in_array(trim($country), self::REQUIRED_COUNTRY_NAMES, true);
    }
}
