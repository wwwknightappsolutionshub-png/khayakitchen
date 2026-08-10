<?php

return [
    /*
    |--------------------------------------------------------------------------
    | Relying Party
    |--------------------------------------------------------------------------
    |
    | RP ID must match the hostname the customer PWA is served from (no port).
    | Origins must include the exact browser origin (scheme + host + port).
    |
    */
    'rp_id' => env('WEBAUTHN_RP_ID', parse_url((string) env('FRONTEND_URL', env('APP_URL', 'http://localhost:3000')), PHP_URL_HOST) ?: 'localhost'),

    'rp_name' => env('WEBAUTHN_RP_NAME', env('APP_NAME', 'KhayaOS')),

    'origins' => array_values(array_filter(array_map(
        'trim',
        explode(',', (string) env('WEBAUTHN_ORIGINS', env('FRONTEND_URL', 'http://localhost:3000')))
    ))),

    'challenge_ttl_seconds' => 300,

    /*
    | When true (tests only), skip cryptographic WebAuthn verification and
    | accept crafted credential payloads for feature coverage.
    */
    'fake_ceremony' => (bool) env('WEBAUTHN_FAKE_CEREMONY', false),
];
