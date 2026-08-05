<?php

return [
    'provider' => env('WHATSAPP_PROVIDER', 'genius'),

    'genius' => [
        'api_key' => env('WHATSAPP_GENIUS_API_KEY'),
        'session_id' => env('WHATSAPP_GENIUS_SESSION_ID'),
        'base_url' => env('WHATSAPP_GENIUS_BASE_URL', 'https://restapi.geniusdevel.com'),
    ],

    'meta' => [
        'access_token' => env('WHATSAPP_META_ACCESS_TOKEN'),
        'phone_number_id' => env('WHATSAPP_META_PHONE_NUMBER_ID'),
    ],
    'twilio' => [
        'account_sid' => env('WHATSAPP_TWILIO_ACCOUNT_SID'),
        'auth_token' => env('WHATSAPP_TWILIO_AUTH_TOKEN'),
        'from' => env('WHATSAPP_TWILIO_FROM'),
    ],
];
