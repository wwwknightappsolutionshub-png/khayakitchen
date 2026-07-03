<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('delivery_orders', function (Blueprint $table) {
            if (! Schema::hasColumn('delivery_orders', 'delivery_address')) {
                $table->text('delivery_address')->nullable()->after('order_id');
            }
        });

        Schema::table('tenant_brandings', function (Blueprint $table) {
            if (! Schema::hasColumn('tenant_brandings', 'accent_color')) {
                $table->string('accent_color')->nullable()->after('secondary_color');
            }
            if (! Schema::hasColumn('tenant_brandings', 'platform_override_logo_url')) {
                $table->text('platform_override_logo_url')->nullable()->after('banner_image');
            }
            if (! Schema::hasColumn('tenant_brandings', 'platform_override_primary_color')) {
                $table->string('platform_override_primary_color')->nullable()->after('platform_override_logo_url');
            }
            if (! Schema::hasColumn('tenant_brandings', 'platform_override_secondary_color')) {
                $table->string('platform_override_secondary_color')->nullable()->after('platform_override_primary_color');
            }
            if (! Schema::hasColumn('tenant_brandings', 'platform_override_accent_color')) {
                $table->string('platform_override_accent_color')->nullable()->after('platform_override_secondary_color');
            }
            if (! Schema::hasColumn('tenant_brandings', 'platform_override_banner_image')) {
                $table->text('platform_override_banner_image')->nullable()->after('platform_override_accent_color');
            }
        });
    }

    public function down(): void
    {
        Schema::table('delivery_orders', function (Blueprint $table) {
            if (Schema::hasColumn('delivery_orders', 'delivery_address')) {
                $table->dropColumn('delivery_address');
            }
        });

        Schema::table('tenant_brandings', function (Blueprint $table) {
            foreach ([
                'accent_color',
                'platform_override_logo_url',
                'platform_override_primary_color',
                'platform_override_secondary_color',
                'platform_override_accent_color',
                'platform_override_banner_image',
            ] as $column) {
                if (Schema::hasColumn('tenant_brandings', $column)) {
                    $table->dropColumn($column);
                }
            }
        });
    }
};
