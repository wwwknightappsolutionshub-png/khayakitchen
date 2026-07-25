<?php

return [
    /*
    | Completed orders lookback for weekday×hour aggregation.
    */
    'lookback_days' => (int) env('CAMPAIGN_TIMING_LOOKBACK_DAYS', 42),

    /*
    | Minimum completed orders in the lookback window before suggestions run.
    */
    'min_orders' => (int) env('CAMPAIGN_TIMING_MIN_ORDERS', 20),

    /*
    | Minimum orders in a single weekday×hour cell to qualify as peak/off-peak signal.
    */
    'min_cell_orders' => (int) env('CAMPAIGN_TIMING_MIN_CELL_ORDERS', 2),

    /*
    | Recompute persisted rhythm if older than this many hours.
    */
    'summary_ttl_hours' => (int) env('CAMPAIGN_TIMING_SUMMARY_TTL_HOURS', 24),

    /*
    | Minutes before a peak block starts when we nudge the tenant.
    */
    'pre_peak_minutes' => (int) env('CAMPAIGN_TIMING_PRE_PEAK_MINUTES', 45),

    /*
    | Max auto-suggestions (channel=suggestion) per tenant per local calendar day.
    */
    'max_suggestions_per_day' => (int) env('CAMPAIGN_TIMING_MAX_PER_DAY', 1),

    /*
    | Default timezone when tenant.timezone is empty.
    */
    'fallback_timezone' => env('CAMPAIGN_TIMING_FALLBACK_TZ', 'UTC'),
];
