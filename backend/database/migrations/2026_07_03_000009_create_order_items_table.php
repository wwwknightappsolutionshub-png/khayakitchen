<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('order_items', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->uuid('tenant_id');
            $table->uuid('order_id');
            $table->uuid('meal_id');
            $table->integer('quantity')->default(1);
            $table->decimal('base_price', 10, 2)->default(0);
            $table->decimal('final_price', 10, 2)->default(0);
            $table->timestamps();

            $table->index('tenant_id');
            $table->index('order_id');
            $table->index('meal_id');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('order_items');
    }
};
