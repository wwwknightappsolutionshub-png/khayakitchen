<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('tenants', function (Blueprint $table) {
            $table->string('currency', 8)->default('GBP')->after('primary_color');
            $table->string('country')->nullable()->after('currency');
            $table->string('country_iso', 2)->nullable()->after('country');
            $table->string('timezone', 64)->nullable()->after('country_iso');
            $table->string('ui_theme', 16)->default('light')->after('timezone');
        });

        Schema::table('customers', function (Blueprint $table) {
            $table->uuid('referred_by_customer_id')->nullable()->after('phone');
            $table->index(['tenant_id', 'referred_by_customer_id']);
        });

        $tenants = DB::table('tenants')->select('id', 'signup_metadata')->get();
        foreach ($tenants as $tenant) {
            $meta = [];
            if (is_string($tenant->signup_metadata) && $tenant->signup_metadata !== '') {
                $decoded = json_decode($tenant->signup_metadata, true);
                if (is_array($decoded)) {
                    $meta = $decoded;
                }
            } elseif (is_array($tenant->signup_metadata)) {
                $meta = $tenant->signup_metadata;
            }

            DB::table('tenants')->where('id', $tenant->id)->update([
                'currency' => strtoupper((string) ($meta['currency'] ?? 'GBP')),
                'country' => $meta['country'] ?? null,
                'country_iso' => isset($meta['country_iso']) ? strtoupper((string) $meta['country_iso']) : null,
                'timezone' => $meta['timezone'] ?? null,
                'ui_theme' => 'light',
            ]);
        }
    }

    public function down(): void
    {
        Schema::table('customers', function (Blueprint $table) {
            $table->dropIndex(['tenant_id', 'referred_by_customer_id']);
            $table->dropColumn('referred_by_customer_id');
        });

        Schema::table('tenants', function (Blueprint $table) {
            $table->dropColumn(['currency', 'country', 'country_iso', 'timezone', 'ui_theme']);
        });
    }
};
