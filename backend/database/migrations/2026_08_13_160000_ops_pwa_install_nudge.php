<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->timestamp('ops_pwa_nudge_sent_at')->nullable()->after('pwa_installed_at');
        });

        Schema::create('ops_pwa_nudge_waves', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->string('wave_key', 64)->unique();
            $table->timestamp('scheduled_at')->nullable();
            $table->timestamp('started_at')->nullable();
            $table->timestamp('completed_at')->nullable();
            $table->unsignedInteger('owners_targeted')->default(0);
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('ops_pwa_nudge_waves');
        Schema::table('users', function (Blueprint $table) {
            $table->dropColumn('ops_pwa_nudge_sent_at');
        });
    }
};
