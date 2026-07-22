<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('tenants', function (Blueprint $table) {
            $table->timestamp('trial_ends_at')->nullable()->after('status');
        });

        Schema::create('tenant_referral_codes', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->uuid('tenant_id')->unique();
            $table->string('code', 32)->unique();
            $table->string('owner_type', 32)->default('tenant');
            $table->unsignedInteger('reward_days')->default(30);
            $table->unsignedInteger('referee_trial_days')->default(30);
            $table->boolean('active')->default(true);
            $table->timestamps();

            $table->foreign('tenant_id')->references('id')->on('tenants')->cascadeOnDelete();
            $table->index('active');
        });

        Schema::create('tenant_referral_leads', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->uuid('referral_code_id');
            $table->uuid('referrer_tenant_id');
            $table->string('prospect_email')->nullable();
            $table->string('prospect_phone', 40)->nullable();
            $table->string('prospect_name', 120)->nullable();
            $table->string('channel', 16);
            $table->string('status', 24)->default('invited');
            $table->timestamp('invited_at')->nullable();
            $table->timestamp('clicked_at')->nullable();
            $table->timestamp('signed_up_at')->nullable();
            $table->timestamp('rewarded_at')->nullable();
            $table->uuid('referred_tenant_id')->nullable();
            $table->timestamps();

            $table->foreign('referral_code_id')->references('id')->on('tenant_referral_codes')->cascadeOnDelete();
            $table->foreign('referrer_tenant_id')->references('id')->on('tenants')->cascadeOnDelete();
            $table->foreign('referred_tenant_id')->references('id')->on('tenants')->nullOnDelete();
            $table->index(['status', 'invited_at']);
            $table->index('prospect_email');
            $table->index('prospect_phone');
            $table->index(['referrer_tenant_id', 'invited_at']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('tenant_referral_leads');
        Schema::dropIfExists('tenant_referral_codes');
        Schema::table('tenants', function (Blueprint $table) {
            $table->dropColumn('trial_ends_at');
        });
    }
};
