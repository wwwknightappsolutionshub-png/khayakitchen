<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('meal_options', function (Blueprint $table) {
            if (! Schema::hasColumn('meal_options', 'inventory_impact')) {
                $table->json('inventory_impact')->nullable()->after('price_delta');
            }
        });

        $driver = Schema::getConnection()->getDriverName();
        if ($driver === 'sqlite') {
            return;
        }

        Schema::table('users', function (Blueprint $table) {
            $table->foreign('tenant_id')->references('id')->on('tenants')->nullOnDelete();
        });

        Schema::table('orders', function (Blueprint $table) {
            $table->foreign('tenant_id')->references('id')->on('tenants')->cascadeOnDelete();
            $table->foreign('customer_id')->references('id')->on('customers')->nullOnDelete();
        });

        Schema::table('order_items', function (Blueprint $table) {
            $table->foreign('order_id')->references('id')->on('orders')->cascadeOnDelete();
            $table->foreign('meal_id')->references('id')->on('meals')->restrictOnDelete();
        });

        Schema::table('option_groups', function (Blueprint $table) {
            $table->foreign('meal_id')->references('id')->on('meals')->cascadeOnDelete();
        });

        Schema::table('meal_options', function (Blueprint $table) {
            $table->foreign('option_group_id')->references('id')->on('option_groups')->cascadeOnDelete();
        });

        Schema::table('inventory_transactions', function (Blueprint $table) {
            $table->foreign('inventory_item_id')->references('id')->on('inventory_items')->restrictOnDelete();
        });

        Schema::table('payments', function (Blueprint $table) {
            $table->foreign('order_id')->references('id')->on('orders')->restrictOnDelete();
        });
    }

    public function down(): void
    {
        if (Schema::hasColumn('meal_options', 'inventory_impact')) {
            Schema::table('meal_options', function (Blueprint $table) {
                $table->dropColumn('inventory_impact');
            });
        }
    }
};
