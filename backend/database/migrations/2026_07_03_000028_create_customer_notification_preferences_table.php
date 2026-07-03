<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('customer_notification_preferences', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->uuid('tenant_id');
            $table->uuid('customer_id');
            $table->boolean('push_enabled')->default(false);
            $table->boolean('whatsapp_enabled')->default(false);
            $table->boolean('email_enabled')->default(false);
            $table->timestamps();

            $table->unique(['tenant_id', 'customer_id']);
            $table->index('tenant_id');
            $table->index('customer_id');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('customer_notification_preferences');
    }
};
