<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('domain_event_logs', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->uuid('tenant_id');
            $table->string('event_name');
            $table->json('payload')->nullable();
            $table->uuid('aggregate_id')->nullable();
            $table->string('aggregate_type')->nullable();
            $table->timestamp('created_at')->useCurrent();

            $table->index('tenant_id');
            $table->index('event_name');
            $table->index('created_at');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('domain_event_logs');
    }
};
