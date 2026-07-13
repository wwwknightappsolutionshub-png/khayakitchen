<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        $driver = Schema::getConnection()->getDriverName();
        if ($driver === 'pgsql') {
            DB::statement('ALTER TABLE users DROP CONSTRAINT IF EXISTS users_role_check');
            DB::statement("ALTER TABLE users ADD CONSTRAINT users_role_check CHECK (role::text = ANY (ARRAY['super_admin'::character varying, 'platform_admin'::character varying, 'platform_support'::character varying, 'owner'::character varying, 'manager'::character varying, 'kitchen'::character varying, 'staff'::character varying]::text[]))");
        }

        Schema::table('device_tokens', function (Blueprint $table) {
            if (! Schema::hasColumn('device_tokens', 'user_id')) {
                $table->uuid('user_id')->nullable()->after('customer_id');
                $table->index('user_id');
            }
        });

        if ($driver === 'pgsql') {
            DB::statement('ALTER TABLE device_tokens ALTER COLUMN customer_id DROP NOT NULL');
        }

        Schema::create('platform_tenant_messages', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->uuid('tenant_id');
            $table->uuid('sender_user_id');
            $table->enum('channel', ['push', 'email']);
            $table->string('title');
            $table->text('body');
            $table->enum('status', ['queued', 'sent', 'failed'])->default('queued');
            $table->text('error_message')->nullable();
            $table->timestamp('sent_at')->nullable();
            $table->timestamp('created_at')->useCurrent();

            $table->index('tenant_id');
            $table->index('sender_user_id');
            $table->index('created_at');
        });

        Schema::create('chat_threads', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->enum('type', ['platform_tenant', 'tenant_customer']);
            $table->uuid('tenant_id');
            $table->string('subject')->nullable();
            $table->uuid('created_by_user_id')->nullable();
            $table->uuid('customer_id')->nullable();
            $table->timestamps();

            $table->index(['type', 'tenant_id']);
            $table->index('customer_id');
        });

        Schema::create('chat_messages', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->uuid('thread_id');
            $table->enum('sender_type', ['platform_user', 'tenant_user', 'customer']);
            $table->uuid('sender_user_id')->nullable();
            $table->uuid('sender_customer_id')->nullable();
            $table->string('sender_label')->nullable();
            $table->text('body');
            $table->timestamp('read_at')->nullable();
            $table->timestamp('created_at')->useCurrent();

            $table->index('thread_id');
            $table->index('created_at');
        });

        Schema::create('meal_likes', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->uuid('tenant_id');
            $table->uuid('meal_id');
            $table->uuid('customer_id')->nullable();
            $table->string('guest_key', 64)->nullable();
            $table->timestamp('created_at')->useCurrent();

            $table->index(['tenant_id', 'meal_id']);
            $table->unique(['tenant_id', 'meal_id', 'customer_id']);
            $table->unique(['tenant_id', 'meal_id', 'guest_key']);
        });

        Schema::create('kitchen_reviews', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->uuid('tenant_id');
            $table->uuid('customer_id')->nullable();
            $table->string('customer_name');
            $table->string('customer_phone', 32)->nullable();
            $table->text('body');
            $table->text('summary')->nullable();
            $table->enum('status', ['pending', 'approved', 'rejected'])->default('pending');
            $table->uuid('moderated_by')->nullable();
            $table->timestamp('moderated_at')->nullable();
            $table->timestamps();

            $table->index(['tenant_id', 'status']);
            $table->index('created_at');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('kitchen_reviews');
        Schema::dropIfExists('meal_likes');
        Schema::dropIfExists('chat_messages');
        Schema::dropIfExists('chat_threads');
        Schema::dropIfExists('platform_tenant_messages');

        Schema::table('device_tokens', function (Blueprint $table) {
            $table->dropIndex(['user_id']);
            $table->dropColumn('user_id');
        });

        $driver = Schema::getConnection()->getDriverName();
        if ($driver === 'pgsql') {
            DB::statement('ALTER TABLE users DROP CONSTRAINT IF EXISTS users_role_check');
            DB::statement("ALTER TABLE users ADD CONSTRAINT users_role_check CHECK (role::text = ANY (ARRAY['super_admin'::character varying, 'owner'::character varying, 'manager'::character varying, 'kitchen'::character varying, 'staff'::character varying]::text[]))");
        }
    }
};
