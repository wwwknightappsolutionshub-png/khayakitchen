<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('loyalty_redemption_vouchers', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->uuid('tenant_id');
            $table->uuid('customer_id');
            $table->uuid('loyalty_account_id');
            $table->uuid('loyalty_package_id')->nullable();
            $table->string('code', 12);
            $table->string('kind', 20); // points | package
            $table->unsignedInteger('points')->default(0);
            $table->unsignedInteger('stamps')->default(0);
            $table->string('reward_type', 40)->default('custom');
            $table->decimal('reward_value', 10, 2)->nullable();
            $table->string('reward_label', 160);
            $table->string('status', 20)->default('pending'); // pending | fulfilled | cancelled | expired
            $table->timestamp('expires_at');
            $table->timestamp('fulfilled_at')->nullable();
            $table->uuid('fulfilled_by')->nullable();
            $table->timestamp('cancelled_at')->nullable();
            $table->timestamps();

            $table->unique(['tenant_id', 'code']);
            $table->index(['tenant_id', 'status']);
            $table->index(['tenant_id', 'customer_id', 'status']);
            $table->index('expires_at');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('loyalty_redemption_vouchers');
    }
};
