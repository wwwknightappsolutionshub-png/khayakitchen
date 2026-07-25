<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

/**
 * Campaign timing intelligence (Phase 1):
 * - Persist per-tenant sales rhythm (weekday × hour)
 * - Allow system suggestion messages in platform_tenant_messages (channel=suggestion)
 *
 * Peak rule (documented): among weekday×hour cells with ≥1 completed order in the
 * lookback window, a cell is "peak" if its count is ≥ the 75th percentile of those
 * positive cell counts (and ≥ min_cell_orders). Off-peak = ≤ 25th percentile.
 */
return new class extends Migration
{
    public function up(): void
    {
        $driver = Schema::getConnection()->getDriverName();

        if ($driver === 'pgsql') {
            DB::statement('ALTER TABLE platform_tenant_messages DROP CONSTRAINT IF EXISTS platform_tenant_messages_channel_check');
            DB::statement("ALTER TABLE platform_tenant_messages ADD CONSTRAINT platform_tenant_messages_channel_check CHECK (channel::text = ANY (ARRAY[
                'push'::character varying,
                'email'::character varying,
                'suggestion'::character varying
            ]))");
        }

        Schema::table('platform_tenant_messages', function (Blueprint $table) {
            if (! Schema::hasColumn('platform_tenant_messages', 'metadata')) {
                $table->json('metadata')->nullable()->after('body');
            }
        });

        if ($driver === 'pgsql') {
            DB::statement('ALTER TABLE platform_tenant_messages ALTER COLUMN sender_user_id DROP NOT NULL');
        }

        Schema::create('tenant_sales_rhythm_summaries', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->uuid('tenant_id')->unique();
            $table->unsignedSmallInteger('lookback_days');
            $table->unsignedInteger('order_count')->default(0);
            $table->string('timezone', 64);
            /** @var array{cells: array<string,int>, peak_keys: list<string>, off_peak_keys: list<string>, peak_windows: list<array{weekday:int,start_hour:int,end_hour:int,label:string}>} */
            $table->json('matrix');
            $table->timestamp('computed_at');
            $table->timestamps();

            $table->index('computed_at');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('tenant_sales_rhythm_summaries');

        Schema::table('platform_tenant_messages', function (Blueprint $table) {
            if (Schema::hasColumn('platform_tenant_messages', 'metadata')) {
                $table->dropColumn('metadata');
            }
        });

        $driver = Schema::getConnection()->getDriverName();
        if ($driver === 'pgsql') {
            DB::table('platform_tenant_messages')->where('channel', 'suggestion')->delete();
            DB::statement('ALTER TABLE platform_tenant_messages DROP CONSTRAINT IF EXISTS platform_tenant_messages_channel_check');
            DB::statement("ALTER TABLE platform_tenant_messages ADD CONSTRAINT platform_tenant_messages_channel_check CHECK (channel::text = ANY (ARRAY[
                'push'::character varying,
                'email'::character varying
            ]))");
        }
    }
};
