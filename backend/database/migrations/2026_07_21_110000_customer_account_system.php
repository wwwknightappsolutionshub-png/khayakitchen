<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('customer_sessions', function (Blueprint $table) {
            $table->string('purpose', 20)->default('account')->after('email');
        });

        Schema::table('customer_email_otps', function (Blueprint $table) {
            $table->string('channel', 20)->default('email')->after('email');
            $table->string('purpose', 20)->default('proximity')->after('channel');
        });

        Schema::create('customer_addresses', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->uuid('tenant_id');
            $table->uuid('customer_id');
            $table->string('label', 80)->nullable();
            $table->string('line1', 255);
            $table->string('line2', 255)->nullable();
            $table->string('city', 120)->nullable();
            $table->string('state', 120)->nullable();
            $table->string('postal_code', 40)->nullable();
            $table->string('country', 80)->nullable();
            $table->boolean('is_default')->default(false);
            $table->timestamps();

            $table->foreign('tenant_id')->references('id')->on('tenants')->cascadeOnDelete();
            $table->foreign('customer_id')->references('id')->on('customers')->cascadeOnDelete();
            $table->index(['tenant_id', 'customer_id']);
        });

        Schema::create('customer_custom_meal_requests', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->uuid('tenant_id');
            $table->uuid('customer_id');
            $table->string('title', 160)->nullable();
            $table->text('message');
            $table->text('constraints')->nullable();
            $table->string('status', 20)->default('submitted');
            $table->uuid('handled_by')->nullable();
            $table->timestamp('acknowledged_at')->nullable();
            $table->timestamp('closed_at')->nullable();
            $table->text('staff_note')->nullable();
            $table->timestamps();

            $table->foreign('tenant_id')->references('id')->on('tenants')->cascadeOnDelete();
            $table->foreign('customer_id')->references('id')->on('customers')->cascadeOnDelete();
            $table->index(['tenant_id', 'status']);
            $table->index(['tenant_id', 'customer_id']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('customer_custom_meal_requests');
        Schema::dropIfExists('customer_addresses');

        Schema::table('customer_email_otps', function (Blueprint $table) {
            $table->dropColumn(['channel', 'purpose']);
        });

        Schema::table('customer_sessions', function (Blueprint $table) {
            $table->dropColumn('purpose');
        });
    }
};
