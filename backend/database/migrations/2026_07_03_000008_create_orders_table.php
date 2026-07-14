<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('orders', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->uuid('tenant_id');
            $table->uuid('customer_id')->nullable();
            $table->enum('status', ['pending', 'accepted', 'preparing', 'ready', 'completed', 'cancelled', 'undone'])->default('pending');
            $table->enum('order_type', ['pickup', 'delivery'])->default('pickup');
            $table->timestamp('scheduled_time')->nullable();
            $table->decimal('total_amount', 10, 2)->default(0);
            $table->uuid('created_by')->nullable();
            $table->uuid('updated_by')->nullable();
            $table->timestamps();
            $table->softDeletes();

            $table->index('tenant_id');
            $table->index('status');
            $table->index('created_at');
            $table->index('customer_id');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('orders');
    }
};
