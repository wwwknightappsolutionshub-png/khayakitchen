<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('revenue_recovery_campaigns', function (Blueprint $table) {
            $table->unsignedInteger('notifications_opened')->default(0)->after('notifications_delivered');
            $table->unsignedInteger('discounted_items_sold')->default(0)->after('orders_count');
        });
    }

    public function down(): void
    {
        Schema::table('revenue_recovery_campaigns', function (Blueprint $table) {
            $table->dropColumn(['notifications_opened', 'discounted_items_sold']);
        });
    }
};
