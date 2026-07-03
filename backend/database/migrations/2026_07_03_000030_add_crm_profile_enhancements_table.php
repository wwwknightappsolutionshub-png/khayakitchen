<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('crm_profiles', function (Blueprint $table) {
            $table->decimal('average_order_value', 12, 2)->default(0)->after('total_spent');
            $table->unsignedSmallInteger('visit_frequency_score')->default(0)->after('favorite_meal_id');
            $table->boolean('is_loyal')->default(false)->after('visit_frequency_score');
        });
    }

    public function down(): void
    {
        Schema::table('crm_profiles', function (Blueprint $table) {
            $table->dropColumn(['average_order_value', 'visit_frequency_score', 'is_loyal']);
        });
    }
};
