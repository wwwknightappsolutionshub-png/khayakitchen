<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        $driver = Schema::getConnection()->getDriverName();

        if ($driver === 'pgsql') {
            // Laravel enum on Postgres uses a CHECK constraint in modern versions.
            DB::statement('ALTER TABLE orders DROP CONSTRAINT IF EXISTS orders_status_check');
            DB::statement("ALTER TABLE orders ADD CONSTRAINT orders_status_check CHECK (status::text = ANY (ARRAY[
                'pending'::character varying,
                'accepted'::character varying,
                'preparing'::character varying,
                'ready'::character varying,
                'completed'::character varying,
                'cancelled'::character varying,
                'undone'::character varying
            ]))");

            // Legacy native enum type (if present).
            try {
                DB::statement("ALTER TYPE orders_status ADD VALUE IF NOT EXISTS 'undone'");
            } catch (\Throwable) {
                // ignore when type does not exist
            }
        }

        // SQLite / MySQL: ENUM is a string column in practice for tests; app validation enforces values.
    }

    public function down(): void
    {
        $driver = Schema::getConnection()->getDriverName();

        if ($driver === 'pgsql') {
            DB::table('orders')->where('status', 'undone')->update(['status' => 'cancelled']);
            DB::statement('ALTER TABLE orders DROP CONSTRAINT IF EXISTS orders_status_check');
            DB::statement("ALTER TABLE orders ADD CONSTRAINT orders_status_check CHECK (status::text = ANY (ARRAY[
                'pending'::character varying,
                'accepted'::character varying,
                'preparing'::character varying,
                'ready'::character varying,
                'completed'::character varying,
                'cancelled'::character varying
            ]))");
        }
    }
};
