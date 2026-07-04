<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('restaurant_statuses', function (Blueprint $table) {
            $table->timestamp('promo_ends_at')->nullable()->after('closing_at');
        });
    }

    public function down(): void
    {
        Schema::table('restaurant_statuses', function (Blueprint $table) {
            $table->dropColumn('promo_ends_at');
        });
    }
};
