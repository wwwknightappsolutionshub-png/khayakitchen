<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('seasonal_promos', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->uuid('tenant_id');
            $table->string('image_url')->nullable();
            $table->string('headline', 160)->nullable();
            $table->string('subheadline', 240)->nullable();
            $table->text('details')->nullable();
            $table->string('cta_label', 80)->nullable();
            $table->uuid('meal_id')->nullable();
            $table->boolean('is_published')->default(false);
            $table->timestamps();

            $table->unique('tenant_id');
            $table->index(['tenant_id', 'is_published']);
        });

        Schema::create('tenant_trial_reminders', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->uuid('tenant_id');
            $table->unsignedTinyInteger('days_before_end');
            $table->json('feature_keys')->nullable();
            $table->timestamp('sent_at');
            $table->timestamps();

            $table->unique(['tenant_id', 'days_before_end']);
            $table->index('tenant_id');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('tenant_trial_reminders');
        Schema::dropIfExists('seasonal_promos');
    }
};
