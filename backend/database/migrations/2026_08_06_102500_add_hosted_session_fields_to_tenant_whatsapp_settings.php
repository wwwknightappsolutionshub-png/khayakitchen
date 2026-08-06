<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('tenant_whatsapp_settings', function (Blueprint $table) {
            if (! Schema::hasColumn('tenant_whatsapp_settings', 'hosted_session_id')) {
                $table->string('hosted_session_id', 255)->nullable()->after('provider');
            }
            if (! Schema::hasColumn('tenant_whatsapp_settings', 'hosted_phone_number')) {
                $table->string('hosted_phone_number', 40)->nullable()->after('hosted_session_id');
            }
            if (! Schema::hasColumn('tenant_whatsapp_settings', 'hosted_status')) {
                $table->string('hosted_status', 32)->default('inactive')->after('hosted_phone_number');
            }
            if (! Schema::hasColumn('tenant_whatsapp_settings', 'hosted_qr_payload')) {
                $table->text('hosted_qr_payload')->nullable()->after('hosted_status');
            }
            if (! Schema::hasColumn('tenant_whatsapp_settings', 'hosted_connected_at')) {
                $table->timestamp('hosted_connected_at')->nullable()->after('hosted_qr_payload');
            }
            if (! Schema::hasColumn('tenant_whatsapp_settings', 'hosted_last_seen_at')) {
                $table->timestamp('hosted_last_seen_at')->nullable()->after('hosted_connected_at');
            }
            if (! Schema::hasColumn('tenant_whatsapp_settings', 'hosted_expires_at')) {
                $table->timestamp('hosted_expires_at')->nullable()->after('hosted_last_seen_at');
            }
        });
    }

    public function down(): void
    {
        Schema::table('tenant_whatsapp_settings', function (Blueprint $table) {
            foreach ([
                'hosted_session_id',
                'hosted_phone_number',
                'hosted_status',
                'hosted_qr_payload',
                'hosted_connected_at',
                'hosted_last_seen_at',
                'hosted_expires_at',
            ] as $column) {
                if (Schema::hasColumn('tenant_whatsapp_settings', $column)) {
                    $table->dropColumn($column);
                }
            }
        });
    }
};
