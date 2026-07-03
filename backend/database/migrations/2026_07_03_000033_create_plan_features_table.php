<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('plan_features', function (Blueprint $table) {
            $table->uuid('plan_id');
            $table->uuid('feature_id');
            $table->boolean('enabled')->default(true);
            $table->timestamps();

            $table->primary(['plan_id', 'feature_id']);
            $table->index('plan_id');
            $table->index('feature_id');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('plan_features');
    }
};
