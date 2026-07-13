<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('users', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->uuid('tenant_id')->nullable();
            $table->string('name');
            $table->string('email');
            $table->string('password');
            $table->enum('role', ['super_admin', 'platform_admin', 'platform_support', 'owner', 'manager', 'kitchen', 'staff'])->default('staff');
            $table->enum('status', ['active', 'disabled'])->default('active');
            $table->timestamp('last_login_at')->nullable();
            $table->timestamps();

            $table->index('tenant_id');
            $table->unique(['tenant_id', 'email']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('users');
    }
};
