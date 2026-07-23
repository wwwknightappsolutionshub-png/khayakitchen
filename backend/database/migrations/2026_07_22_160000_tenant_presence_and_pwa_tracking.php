<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->timestamp('last_seen_at')->nullable()->after('last_login_at');
            $table->timestamp('pwa_installed_at')->nullable()->after('last_seen_at');
        });

        Schema::table('tenants', function (Blueprint $table) {
            $table->timestamp('last_poked_at')->nullable()->after('trial_ends_at');
        });
    }

    public function down(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->dropColumn(['last_seen_at', 'pwa_installed_at']);
        });

        Schema::table('tenants', function (Blueprint $table) {
            $table->dropColumn('last_poked_at');
        });
    }
};
