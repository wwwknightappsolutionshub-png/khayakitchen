<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('plans', function (Blueprint $table) {
            $table->string('slug')->nullable()->unique()->after('name');
            $table->text('description')->nullable()->after('slug');
            $table->string('currency', 8)->default('GBP')->after('price_yearly');
            $table->string('cta_text')->nullable()->after('currency');
            $table->string('plan_color', 32)->nullable()->after('cta_text');
            $table->string('plan_icon', 64)->nullable()->after('plan_color');
            $table->boolean('is_recommended')->default(false)->after('is_visible');
            $table->unsignedInteger('display_order')->default(0)->after('is_recommended');
            $table->json('marketing_features')->nullable()->after('display_order');
            $table->unsignedInteger('max_categories')->default(10)->after('max_customers');
            $table->unsignedInteger('max_staff')->default(5)->after('max_categories');
            $table->unsignedInteger('max_campaigns_per_month')->default(10)->after('max_staff');
            $table->unsignedInteger('max_push_notifications_per_month')->default(1000)->after('max_campaigns_per_month');
            $table->unsignedInteger('max_storage_mb')->default(500)->after('max_push_notifications_per_month');
            $table->unsignedInteger('max_images')->default(50)->after('max_storage_mb');
            $table->unsignedInteger('max_branches')->default(1)->after('max_images');
            $table->unsignedInteger('max_drivers')->default(5)->after('max_branches');
            $table->unsignedInteger('max_products')->default(50)->after('max_drivers');
            $table->unsignedInteger('max_loyalty_members')->default(500)->after('max_products');
            $table->unsignedInteger('max_active_promotions')->default(3)->after('max_loyalty_members');
            $table->unsignedInteger('max_delivery_zones')->default(5)->after('max_active_promotions');
            $table->json('unlimited_flags')->nullable()->after('max_delivery_zones');
            $table->softDeletes();
        });

        Schema::table('features', function (Blueprint $table) {
            $table->string('icon', 64)->nullable()->after('category');
            $table->string('module', 64)->nullable()->after('icon');
            $table->string('status', 32)->default('active')->after('module');
            $table->text('internal_notes')->nullable()->after('status');
            $table->softDeletes();
        });

        Schema::table('tenant_subscriptions', function (Blueprint $table) {
            $table->string('billing_status', 32)->default('current')->after('status');
        });

        Schema::table('platform_settings', function (Blueprint $table) {
            if (! Schema::hasColumn('platform_settings', 'public_pricing_enabled')) {
                $table->boolean('public_pricing_enabled')->default(true)->after('ticker_text');
            }
        });

        Schema::create('tenant_entitlement_overrides', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->uuid('tenant_id');
            $table->string('override_type', 32);
            $table->string('override_key', 128);
            $table->boolean('value_bool')->nullable();
            $table->unsignedInteger('value_int')->nullable();
            $table->boolean('is_unlimited')->default(false);
            $table->boolean('is_permanent')->default(true);
            $table->timestamp('expires_at')->nullable();
            $table->text('reason')->nullable();
            $table->uuid('created_by')->nullable();
            $table->timestamps();

            $table->foreign('tenant_id')->references('id')->on('tenants')->cascadeOnDelete();
            $table->index(['tenant_id', 'override_type']);
            $table->unique(['tenant_id', 'override_type', 'override_key']);
        });

        Schema::create('subscription_history', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->uuid('tenant_id');
            $table->uuid('plan_id')->nullable();
            $table->uuid('previous_plan_id')->nullable();
            $table->string('action', 64);
            $table->json('metadata')->nullable();
            $table->uuid('created_by')->nullable();
            $table->timestamp('created_at')->useCurrent();

            $table->foreign('tenant_id')->references('id')->on('tenants')->cascadeOnDelete();
            $table->index(['tenant_id', 'created_at']);
        });

        Schema::create('upgrade_requests', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->uuid('tenant_id');
            $table->uuid('current_plan_id')->nullable();
            $table->uuid('requested_plan_id')->nullable();
            $table->string('status', 32)->default('pending');
            $table->text('message')->nullable();
            $table->uuid('created_by')->nullable();
            $table->timestamps();

            $table->foreign('tenant_id')->references('id')->on('tenants')->cascadeOnDelete();
            $table->index(['status', 'created_at']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('upgrade_requests');
        Schema::dropIfExists('subscription_history');
        Schema::dropIfExists('tenant_entitlement_overrides');

        Schema::table('platform_settings', function (Blueprint $table) {
            if (Schema::hasColumn('platform_settings', 'public_pricing_enabled')) {
                $table->dropColumn('public_pricing_enabled');
            }
        });

        Schema::table('tenant_subscriptions', function (Blueprint $table) {
            $table->dropColumn('billing_status');
        });

        Schema::table('features', function (Blueprint $table) {
            $table->dropSoftDeletes();
            $table->dropColumn(['icon', 'module', 'status', 'internal_notes']);
        });

        Schema::table('plans', function (Blueprint $table) {
            $table->dropSoftDeletes();
            $table->dropColumn([
                'slug', 'description', 'currency', 'cta_text', 'plan_color', 'plan_icon',
                'is_recommended', 'display_order', 'marketing_features',
                'max_categories', 'max_staff', 'max_campaigns_per_month',
                'max_push_notifications_per_month', 'max_storage_mb', 'max_images',
                'max_branches', 'max_drivers', 'max_products', 'max_loyalty_members',
                'max_active_promotions', 'max_delivery_zones', 'unlimited_flags',
            ]);
        });
    }
};
