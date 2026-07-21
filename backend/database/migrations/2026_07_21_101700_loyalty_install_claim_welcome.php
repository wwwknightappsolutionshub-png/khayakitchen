<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('loyalty_settings', function (Blueprint $table) {
            $table->unsignedInteger('install_claim_points')->default(200)->after('near_goal_threshold_percent');
            $table->string('install_welcome_subject', 200)->nullable()->after('install_claim_points');
            $table->text('install_welcome_body')->nullable()->after('install_welcome_subject');
        });

        Schema::table('loyalty_accounts', function (Blueprint $table) {
            $table->timestamp('install_claimed_at')->nullable()->after('enrollment_source');
            $table->timestamp('install_welcome_sent_at')->nullable()->after('install_claimed_at');
        });

        Schema::table('customers', function (Blueprint $table) {
            $table->timestamp('app_installed_at')->nullable()->after('referred_by_customer_id');
        });
    }

    public function down(): void
    {
        Schema::table('customers', function (Blueprint $table) {
            $table->dropColumn('app_installed_at');
        });

        Schema::table('loyalty_accounts', function (Blueprint $table) {
            $table->dropColumn(['install_claimed_at', 'install_welcome_sent_at']);
        });

        Schema::table('loyalty_settings', function (Blueprint $table) {
            $table->dropColumn(['install_claim_points', 'install_welcome_subject', 'install_welcome_body']);
        });
    }
};
