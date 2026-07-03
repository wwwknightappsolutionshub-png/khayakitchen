<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('restaurant_statuses', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->uuid('tenant_id')->unique();
            $table->string('status')->default('open');
            $table->boolean('is_accepting_orders')->default(true);
            $table->boolean('promo_alerts_enabled')->default(true);
            $table->timestamp('last_promo_alert_at')->nullable();
            $table->string('previous_status')->nullable();
            $table->uuid('updated_by')->nullable();
            $table->timestamps();

            $table->index('tenant_id');
            $table->index('status');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('restaurant_statuses');
    }
};
