<?php

return [
    'websocket' => [
        'host' => env('REALTIME_WS_HOST', '0.0.0.0'),
        'port' => (int) env('REALTIME_WS_PORT', 8080),
        'public_host' => env('REALTIME_WS_PUBLIC_HOST', 'localhost'),
        'public_port' => (int) env('REALTIME_WS_PUBLIC_PORT', 8080),
        'scheme' => env('REALTIME_WS_SCHEME', 'ws'),
        'poll_interval_ms' => (int) env('REALTIME_WS_POLL_MS', 250),
    ],

    'buffer' => [
        'max_events' => 200,
        'ttl_seconds' => 3600,
    ],

    'debounce' => [
        'revenue_seconds' => 3,
        'order_count_seconds' => 3,
    ],
];
