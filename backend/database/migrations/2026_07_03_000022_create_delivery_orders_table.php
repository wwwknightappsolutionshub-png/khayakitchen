<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('delivery_orders', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->uuid('tenant_id');
            $table->uuid('order_id');
            $table->enum('status', ['pending', 'assigned', 'picked_up', 'delivered'])->default('pending');
            $table->string('driver_name')->nullable();
            $table->timestamps();

            $table->index('tenant_id');
            $table->index('order_id');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('delivery_orders');
    }
};
