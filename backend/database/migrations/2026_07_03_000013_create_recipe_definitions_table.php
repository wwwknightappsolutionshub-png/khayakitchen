<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('recipe_definitions', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->uuid('tenant_id');
            $table->uuid('meal_id');
            $table->enum('portion_size', ['small', 'medium', 'large'])->default('medium');
            $table->timestamp('created_at')->useCurrent();

            $table->index('tenant_id');
            $table->index('meal_id');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('recipe_definitions');
    }
};
