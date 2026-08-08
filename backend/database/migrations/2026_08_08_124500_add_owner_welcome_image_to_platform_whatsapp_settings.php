<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('platform_whatsapp_settings', function (Blueprint $table) {
            if (! Schema::hasColumn('platform_whatsapp_settings', 'owner_welcome_image_path')) {
                $table->string('owner_welcome_image_path')->nullable()->after('twilio_from');
            }
            if (! Schema::hasColumn('platform_whatsapp_settings', 'owner_welcome_image_url')) {
                $table->string('owner_welcome_image_url', 2048)->nullable()->after('owner_welcome_image_path');
            }
            if (! Schema::hasColumn('platform_whatsapp_settings', 'owner_welcome_image_mime')) {
                $table->string('owner_welcome_image_mime', 64)->nullable()->after('owner_welcome_image_url');
            }
            if (! Schema::hasColumn('platform_whatsapp_settings', 'owner_welcome_image_data')) {
                // Base64 JPEG stored in DB so welcome media survives disk/CDN gaps.
                $table->mediumText('owner_welcome_image_data')->nullable()->after('owner_welcome_image_mime');
            }
        });
    }

    public function down(): void
    {
        Schema::table('platform_whatsapp_settings', function (Blueprint $table) {
            foreach (['owner_welcome_image_data', 'owner_welcome_image_mime', 'owner_welcome_image_url', 'owner_welcome_image_path'] as $column) {
                if (Schema::hasColumn('platform_whatsapp_settings', $column)) {
                    $table->dropColumn($column);
                }
            }
        });
    }
};
