<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('tenant_subscriptions', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->uuid('tenant_id')->unique();
            $table->uuid('plan_id');
            $table->string('status')->default('active');
            $table->timestamp('started_at')->useCurrent();
            $table->timestamp('ends_at')->nullable();
            $table->timestamps();

            $table->index('plan_id');
            $table->index('status');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('tenant_subscriptions');
    }
};
