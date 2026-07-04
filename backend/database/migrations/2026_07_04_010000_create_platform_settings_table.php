<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('platform_settings', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->string('app_name')->default('KhayaOS');
            $table->text('logo_url')->nullable();
            $table->string('primary_color')->nullable();
            $table->string('secondary_color')->nullable();
            $table->string('accent_color')->nullable();
            $table->string('background_color')->nullable();
            $table->boolean('splash_enabled')->default(true);
            $table->string('splash_headline')->nullable();
            $table->string('splash_subheadline')->nullable();
            $table->text('splash_image_url')->nullable();
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('platform_settings');
    }
};
