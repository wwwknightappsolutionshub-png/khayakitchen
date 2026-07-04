<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    private const DEFAULT_TICKER_TEXT = 'Welcome to our Kitchen, our delicious and freshly meals are ready for you to order now | Place your order now | Don\'t forget we run referral discounts and end of day special offer, turn on notification to get alert when we have it.';

    public function up(): void
    {
        DB::table('platform_settings')
            ->whereNull('ticker_text')
            ->update(['ticker_text' => self::DEFAULT_TICKER_TEXT]);

        DB::table('tenant_brandings')
            ->whereNull('ticker_text')
            ->update(['ticker_text' => self::DEFAULT_TICKER_TEXT]);

        DB::table('tenant_brandings')
            ->where('platform_override_ticker_text', '')
            ->update(['platform_override_ticker_text' => null]);
    }

    public function down(): void
    {
        // Data backfill is not reversed.
    }
};
