<?php

use Illuminate\Foundation\Inspiring;
use Illuminate\Support\Facades\Artisan;
use Illuminate\Support\Facades\Schedule;

Artisan::command('inspire', function () {
    $this->comment(Inspiring::quote());
})->purpose('Display an inspiring quote');

Schedule::command('revenue-recovery:process-schedule')->everyMinute();
Schedule::command('revenue-recovery:process-proximity')->everyFiveMinutes();
Schedule::command('campaign-timing:process-suggestions')->everyThirtyMinutes();
Schedule::command('orders:mark-undone')->dailyAt('00:05');
Schedule::command('trials:send-reminders')->dailyAt('09:00');
