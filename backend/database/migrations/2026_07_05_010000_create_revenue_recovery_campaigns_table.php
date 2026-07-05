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
        Schema::create('revenue_recovery_campaigns', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->uuid('tenant_id');
            $table->string('name');
            $table->string('campaign_type');
            $table->string('discount_type');
            $table->decimal('discount_value', 10, 2);
            $table->json('meal_ids')->nullable();
            $table->json('category_ids')->nullable();
            $table->timestamp('starts_at');
            $table->timestamp('ends_at');
            $table->string('status')->default('draft');
            $table->boolean('notifications_enabled')->default(false);
            $table->string('notification_title')->nullable();
            $table->text('notification_message')->nullable();
            $table->string('target_audience')->default('all');
            $table->unsignedInteger('redemption_limit')->nullable();
            $table->unsignedInteger('redemption_count')->default(0);
            $table->unsignedInteger('orders_count')->default(0);
            $table->decimal('recovered_revenue', 12, 2)->default(0);
            $table->unsignedInteger('notifications_sent')->default(0);
            $table->unsignedInteger('notifications_delivered')->default(0);
            $table->uuid('created_by')->nullable();
            $table->uuid('duplicated_from_id')->nullable();
            $table->timestamp('activated_at')->nullable();
            $table->timestamp('archived_at')->nullable();
            $table->softDeletes();
            $table->timestamps();

            $table->index('tenant_id');
            $table->index(['tenant_id', 'status']);
            $table->index(['tenant_id', 'starts_at', 'ends_at']);
        });

        Schema::table('orders', function (Blueprint $table) {
            $table->uuid('revenue_recovery_campaign_id')->nullable()->after('total_amount');
            $table->decimal('discount_total', 10, 2)->default(0)->after('revenue_recovery_campaign_id');
        });

        Schema::table('order_items', function (Blueprint $table) {
            $table->decimal('discount_amount', 10, 2)->default(0)->after('final_price');
            $table->uuid('revenue_recovery_campaign_id')->nullable()->after('discount_amount');
        });

        if (Schema::hasTable('features')) {
            $exists = DB::table('features')->where('key', 'revenue_recovery')->exists();
            if (! $exists) {
                $featureId = (string) Str::uuid();
                DB::table('features')->insert([
                    'id' => $featureId,
                    'key' => 'revenue_recovery',
                    'name' => 'Revenue Recovery',
                    'category' => 'marketing',
                    'module' => 'revenue_recovery',
                    'description' => 'Time-limited recovery campaigns with discounted ordering',
                    'status' => 'active',
                    'created_at' => now(),
                    'updated_at' => now(),
                ]);

                $planIds = DB::table('plans')->where('is_active', true)->pluck('id');
                foreach ($planIds as $planId) {
                    DB::table('plan_features')->insert([
                        'plan_id' => $planId,
                        'feature_id' => $featureId,
                        'enabled' => true,
                        'created_at' => now(),
                        'updated_at' => now(),
                    ]);
                }
            }
        }
    }

    public function down(): void
    {
        Schema::table('order_items', function (Blueprint $table) {
            $table->dropColumn(['discount_amount', 'revenue_recovery_campaign_id']);
        });

        Schema::table('orders', function (Blueprint $table) {
            $table->dropColumn(['revenue_recovery_campaign_id', 'discount_total']);
        });

        Schema::dropIfExists('revenue_recovery_campaigns');
    }
};
