<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('orders', function (Blueprint $table) {
            $table->uuid('accepted_by')->nullable()->after('updated_by');
            $table->uuid('completed_by')->nullable()->after('accepted_by');
            $table->timestamp('accepted_at')->nullable()->after('completed_by');
            $table->timestamp('completed_at')->nullable()->after('accepted_at');
            $table->index('accepted_by');
            $table->index('completed_by');
        });

        Schema::create('order_status_events', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->uuid('tenant_id');
            $table->uuid('order_id');
            $table->uuid('user_id')->nullable();
            $table->string('from_status', 32)->nullable();
            $table->string('to_status', 32);
            $table->timestamp('created_at')->useCurrent();

            $table->index(['tenant_id', 'user_id', 'created_at']);
            $table->index(['order_id', 'created_at']);
            $table->index(['tenant_id', 'to_status', 'created_at']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('order_status_events');

        Schema::table('orders', function (Blueprint $table) {
            $table->dropIndex(['accepted_by']);
            $table->dropIndex(['completed_by']);
            $table->dropColumn(['accepted_by', 'completed_by', 'accepted_at', 'completed_at']);
        });
    }
};
