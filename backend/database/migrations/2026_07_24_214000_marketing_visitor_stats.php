<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('marketing_visitor_stats', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->unsignedInteger('display_count')->default(200);
            $table->timestamps();
        });

        Schema::create('marketing_visitor_ips', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->string('ip_hash', 64)->unique();
            $table->timestamp('first_seen_at');
            $table->timestamp('last_seen_at');
            $table->unsignedInteger('visit_count')->default(1);
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('marketing_visitor_ips');
        Schema::dropIfExists('marketing_visitor_stats');
    }
};
