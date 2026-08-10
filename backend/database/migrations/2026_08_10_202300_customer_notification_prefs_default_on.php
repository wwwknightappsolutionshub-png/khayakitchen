<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('customer_notification_preferences', function (Blueprint $table) {
            $table->boolean('push_enabled')->default(true)->change();
            $table->boolean('whatsapp_enabled')->default(true)->change();
            $table->boolean('email_enabled')->default(true)->change();
        });

        // Activate channels for customers who never set preferences (all still off).
        DB::table('customer_notification_preferences')
            ->where('push_enabled', false)
            ->where('whatsapp_enabled', false)
            ->where('email_enabled', false)
            ->update([
                'push_enabled' => true,
                'whatsapp_enabled' => true,
                'email_enabled' => true,
            ]);
    }

    public function down(): void
    {
        Schema::table('customer_notification_preferences', function (Blueprint $table) {
            $table->boolean('push_enabled')->default(false)->change();
            $table->boolean('whatsapp_enabled')->default(false)->change();
            $table->boolean('email_enabled')->default(false)->change();
        });
    }
};
