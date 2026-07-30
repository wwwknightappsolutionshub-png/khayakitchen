<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('tenant_brandings', function (Blueprint $table) {
            $table->string('bank_name', 120)->nullable()->after('ticker_text');
            $table->string('bank_account_name', 120)->nullable()->after('bank_name');
            $table->string('bank_account_number', 64)->nullable()->after('bank_account_name');
        });

        Schema::table('payments', function (Blueprint $table) {
            $table->string('proof_path', 512)->nullable()->after('amount');
            $table->string('proof_mime', 120)->nullable()->after('proof_path');
            $table->string('proof_original_name', 255)->nullable()->after('proof_mime');
            $table->unsignedInteger('proof_size')->nullable()->after('proof_original_name');
            $table->timestamp('proof_wait_started_at')->nullable()->after('proof_size');
            $table->timestamp('proof_uploaded_at')->nullable()->after('proof_wait_started_at');
            $table->timestamp('verified_at')->nullable()->after('proof_uploaded_at');
            $table->uuid('verified_by')->nullable()->after('verified_at');
        });
    }

    public function down(): void
    {
        Schema::table('payments', function (Blueprint $table) {
            $table->dropColumn([
                'proof_path',
                'proof_mime',
                'proof_original_name',
                'proof_size',
                'proof_wait_started_at',
                'proof_uploaded_at',
                'verified_at',
                'verified_by',
            ]);
        });

        Schema::table('tenant_brandings', function (Blueprint $table) {
            $table->dropColumn(['bank_name', 'bank_account_name', 'bank_account_number']);
        });
    }
};
