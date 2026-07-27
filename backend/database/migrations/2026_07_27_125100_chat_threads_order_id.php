<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * In-session order chat: optional order_id on tenant↔customer threads
 * so kitchen staff can chat about a live order (pending|accepted|preparing|ready).
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::table('chat_threads', function (Blueprint $table) {
            if (! Schema::hasColumn('chat_threads', 'order_id')) {
                $table->uuid('order_id')->nullable()->after('customer_id');
                $table->index('order_id');
            }
        });
    }

    public function down(): void
    {
        Schema::table('chat_threads', function (Blueprint $table) {
            if (Schema::hasColumn('chat_threads', 'order_id')) {
                $table->dropColumn('order_id');
            }
        });
    }
};
