<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('customers', function (Blueprint $table) {
            $table->string('password')->nullable()->after('phone');
        });

        Schema::create('customer_webauthn_credentials', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->uuid('tenant_id');
            $table->uuid('customer_id');
            $table->string('credential_id', 512)->unique();
            $table->text('public_key');
            $table->unsignedBigInteger('counter')->default(0);
            $table->json('transports')->nullable();
            $table->string('device_label')->nullable();
            $table->timestamps();

            $table->index(['tenant_id', 'customer_id']);
            $table->foreign('customer_id')->references('id')->on('customers')->cascadeOnDelete();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('customer_webauthn_credentials');

        Schema::table('customers', function (Blueprint $table) {
            $table->dropColumn('password');
        });
    }
};
