<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('loyalty_settings', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->uuid('tenant_id')->unique();
            $table->boolean('enrollments_paused')->default(false);
            $table->unsignedInteger('referral_stamp_credit')->default(1);
            $table->unsignedInteger('referral_points_credit')->default(25);
            $table->unsignedTinyInteger('near_goal_threshold_percent')->default(80);
            $table->timestamps();
        });

        Schema::create('loyalty_packages', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->uuid('tenant_id');
            $table->string('name', 120);
            $table->string('description', 500)->nullable();
            $table->string('package_type', 20); // stamp | points
            $table->unsignedInteger('goal_value');
            $table->string('reward_type', 40); // free_meal | percent_off | fixed_credit | custom
            $table->decimal('reward_value', 10, 2)->nullable();
            $table->string('reward_label', 160);
            $table->boolean('is_active')->default(true);
            $table->unsignedInteger('sort_order')->default(0);
            $table->timestamps();

            $table->index(['tenant_id', 'is_active']);
        });

        Schema::table('loyalty_accounts', function (Blueprint $table) {
            $table->unsignedInteger('stamps_balance')->default(0)->after('points_balance');
            $table->string('membership_status', 20)->default('prospect')->after('tier');
            $table->timestamp('enrolled_at')->nullable()->after('membership_status');
            $table->timestamp('opted_in_at')->nullable()->after('enrolled_at');
            $table->timestamp('welcome_notified_at')->nullable()->after('opted_in_at');
            $table->string('enrollment_source', 20)->nullable()->after('welcome_notified_at');
        });

        Schema::create('loyalty_package_progress', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->uuid('tenant_id');
            $table->uuid('loyalty_account_id');
            $table->uuid('loyalty_package_id');
            $table->unsignedInteger('current_progress')->default(0);
            $table->unsignedInteger('times_completed')->default(0);
            $table->timestamp('last_near_goal_notified_at')->nullable();
            $table->timestamps();

            $table->unique(['loyalty_account_id', 'loyalty_package_id'], 'loyalty_progress_unique');
            $table->index('tenant_id');
        });

        Schema::create('loyalty_referrals', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->uuid('tenant_id');
            $table->uuid('referrer_customer_id');
            $table->string('token', 64)->unique();
            $table->uuid('referred_customer_id')->nullable();
            $table->uuid('credited_order_id')->nullable();
            $table->string('status', 20)->default('open'); // open | attributed | credited | blocked
            $table->timestamp('attributed_at')->nullable();
            $table->timestamp('credited_at')->nullable();
            $table->timestamps();

            $table->index(['tenant_id', 'referrer_customer_id']);
            $table->index(['tenant_id', 'referred_customer_id']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('loyalty_referrals');
        Schema::dropIfExists('loyalty_package_progress');
        Schema::table('loyalty_accounts', function (Blueprint $table) {
            $table->dropColumn([
                'stamps_balance',
                'membership_status',
                'enrolled_at',
                'opted_in_at',
                'welcome_notified_at',
                'enrollment_source',
            ]);
        });
        Schema::dropIfExists('loyalty_packages');
        Schema::dropIfExists('loyalty_settings');
    }
};
