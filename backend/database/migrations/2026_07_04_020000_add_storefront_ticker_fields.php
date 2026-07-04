<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('tenant_brandings', function (Blueprint $table) {
            if (! Schema::hasColumn('tenant_brandings', 'ticker_enabled')) {
                $table->boolean('ticker_enabled')->default(true)->after('banner_image');
            }
            if (! Schema::hasColumn('tenant_brandings', 'ticker_text')) {
                $table->text('ticker_text')->nullable()->after('ticker_enabled');
            }
            if (! Schema::hasColumn('tenant_brandings', 'platform_override_ticker_enabled')) {
                $table->boolean('platform_override_ticker_enabled')->nullable()->after('platform_override_banner_image');
            }
            if (! Schema::hasColumn('tenant_brandings', 'platform_override_ticker_text')) {
                $table->text('platform_override_ticker_text')->nullable()->after('platform_override_ticker_enabled');
            }
        });

        Schema::table('platform_settings', function (Blueprint $table) {
            if (! Schema::hasColumn('platform_settings', 'ticker_enabled')) {
                $table->boolean('ticker_enabled')->default(true)->after('splash_image_url');
            }
            if (! Schema::hasColumn('platform_settings', 'ticker_text')) {
                $table->text('ticker_text')->nullable()->after('ticker_enabled');
            }
        });
    }

    public function down(): void
    {
        Schema::table('tenant_brandings', function (Blueprint $table) {
            foreach ([
                'ticker_enabled',
                'ticker_text',
                'platform_override_ticker_enabled',
                'platform_override_ticker_text',
            ] as $column) {
                if (Schema::hasColumn('tenant_brandings', $column)) {
                    $table->dropColumn($column);
                }
            }
        });

        Schema::table('platform_settings', function (Blueprint $table) {
            foreach (['ticker_enabled', 'ticker_text'] as $column) {
                if (Schema::hasColumn('platform_settings', $column)) {
                    $table->dropColumn($column);
                }
            }
        });
    }
};
