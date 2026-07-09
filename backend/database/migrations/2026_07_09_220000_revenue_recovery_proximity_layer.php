<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Str;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('tenant_revenue_recovery_settings', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->uuid('tenant_id')->unique();
            $table->boolean('time_based_enabled')->default(true);
            $table->boolean('proximity_enabled')->default(false);
            $table->decimal('geofence_radius_km', 8, 2)->default(10);
            $table->boolean('tenant_can_edit_radius')->default(true);
            $table->decimal('kitchen_lat', 10, 7)->nullable();
            $table->decimal('kitchen_lng', 10, 7)->nullable();
            $table->string('kitchen_address_text')->nullable();
            $table->json('proximity_bait_tiers')->nullable();
            $table->unsignedSmallInteger('max_daily_proximity_pushes_per_customer')->default(1);
            $table->unsignedSmallInteger('location_accuracy_max_meters')->default(500);
            $table->timestamps();

            $table->foreign('tenant_id')->references('id')->on('tenants')->cascadeOnDelete();
        });

        Schema::create('customer_email_otps', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->uuid('tenant_id');
            $table->string('phone', 32);
            $table->string('email');
            $table->string('otp_hash');
            $table->timestamp('expires_at');
            $table->unsignedTinyInteger('attempts')->default(0);
            $table->timestamp('created_at')->nullable();

            $table->index(['tenant_id', 'email']);
            $table->index(['tenant_id', 'phone']);
        });

        Schema::create('customer_sessions', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->uuid('tenant_id');
            $table->uuid('customer_id');
            $table->string('phone', 32);
            $table->string('email');
            $table->string('token_hash', 64)->unique();
            $table->boolean('location_opt_in')->default(false);
            $table->timestamp('last_seen_at')->nullable();
            $table->timestamp('expires_at');
            $table->timestamps();

            $table->foreign('tenant_id')->references('id')->on('tenants')->cascadeOnDelete();
            $table->foreign('customer_id')->references('id')->on('customers')->cascadeOnDelete();
            $table->index(['tenant_id', 'customer_id']);
        });

        Schema::create('customer_locations', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->uuid('tenant_id');
            $table->uuid('customer_id');
            $table->decimal('lat', 10, 7);
            $table->decimal('lng', 10, 7);
            $table->unsignedInteger('accuracy_meters')->nullable();
            $table->string('source', 32)->default('heartbeat');
            $table->timestamp('captured_at');
            $table->timestamps();

            $table->foreign('tenant_id')->references('id')->on('tenants')->cascadeOnDelete();
            $table->foreign('customer_id')->references('id')->on('customers')->cascadeOnDelete();
            $table->index(['tenant_id', 'customer_id', 'captured_at']);
        });

        Schema::create('proximity_offer_events', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->uuid('tenant_id');
            $table->uuid('customer_id');
            $table->uuid('campaign_id')->nullable();
            $table->string('channel', 32);
            $table->string('event_type', 32);
            $table->decimal('distance_km', 8, 2)->nullable();
            $table->text('message')->nullable();
            $table->timestamp('created_at')->nullable();

            $table->index(['tenant_id', 'customer_id', 'created_at']);
            $table->index(['tenant_id', 'event_type', 'created_at']);
        });

        Schema::table('revenue_recovery_campaigns', function (Blueprint $table) {
            $table->json('proximity_bait_tiers')->nullable()->after('target_audience');
            $table->unsignedInteger('proximity_impressions')->default(0)->after('notifications_opened');
            $table->unsignedInteger('proximity_push_sent')->default(0)->after('proximity_impressions');
        });

        if (Schema::hasTable('features')) {
            foreach ([
                ['key' => 'revenue_recovery.time_based', 'name' => 'Revenue Recovery — Time Based', 'description' => 'Happy hour and scheduled discount campaigns'],
                ['key' => 'revenue_recovery.proximity', 'name' => 'Revenue Recovery — Proximity Bait', 'description' => 'Geofenced proximity bait notifications'],
            ] as $feature) {
                if (! DB::table('features')->where('key', $feature['key'])->exists()) {
                    $featureId = (string) Str::uuid();
                    DB::table('features')->insert([
                        'id' => $featureId,
                        'key' => $feature['key'],
                        'name' => $feature['name'],
                        'category' => 'marketing',
                        'module' => 'revenue_recovery',
                        'description' => $feature['description'],
                        'status' => 'active',
                        'created_at' => now(),
                        'updated_at' => now(),
                    ]);

                    $planIds = DB::table('plans')->where('is_active', true)->pluck('id');
                    foreach ($planIds as $planId) {
                        DB::table('plan_features')->insert([
                            'plan_id' => $planId,
                            'feature_id' => $featureId,
                            'enabled' => $feature['key'] === 'revenue_recovery.time_based',
                            'created_at' => now(),
                            'updated_at' => now(),
                        ]);
                    }
                }
            }
        }
    }

    public function down(): void
    {
        Schema::table('revenue_recovery_campaigns', function (Blueprint $table) {
            $table->dropColumn(['proximity_bait_tiers', 'proximity_impressions', 'proximity_push_sent']);
        });

        Schema::dropIfExists('proximity_offer_events');
        Schema::dropIfExists('customer_locations');
        Schema::dropIfExists('customer_sessions');
        Schema::dropIfExists('customer_email_otps');
        Schema::dropIfExists('tenant_revenue_recovery_settings');

        if (Schema::hasTable('features')) {
            DB::table('features')->whereIn('key', [
                'revenue_recovery.time_based',
                'revenue_recovery.proximity',
            ])->delete();
        }
    }
};
