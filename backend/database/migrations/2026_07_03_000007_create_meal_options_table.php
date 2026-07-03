<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('meal_options', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->uuid('tenant_id');
            $table->uuid('option_group_id');
            $table->string('name');
            $table->decimal('price_delta', 10, 2)->default(0);
            $table->json('inventory_impact')->nullable();
            $table->boolean('is_active')->default(true);
            $table->timestamps();

            $table->index('tenant_id');
            $table->index('option_group_id');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('meal_options');
    }
};
