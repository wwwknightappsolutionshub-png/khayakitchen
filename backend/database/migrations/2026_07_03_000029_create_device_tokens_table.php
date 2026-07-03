<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('device_tokens', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->uuid('tenant_id');
            $table->uuid('customer_id');
            $table->text('device_token');
            $table->string('platform')->default('web');
            $table->timestamp('created_at')->useCurrent();

            $table->index('tenant_id');
            $table->index('customer_id');
            $table->unique(['tenant_id', 'device_token']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('device_tokens');
    }
};
