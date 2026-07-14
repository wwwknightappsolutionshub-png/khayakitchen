<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('features', function (Blueprint $table) {
            $table->date('implemented_at')->nullable()->after('internal_notes');
        });

        // Backfill existing catalog rows from their created date for record keeping.
        DB::table('features')
            ->whereNull('implemented_at')
            ->update(['implemented_at' => DB::raw('DATE(created_at)')]);
    }

    public function down(): void
    {
        Schema::table('features', function (Blueprint $table) {
            $table->dropColumn('implemented_at');
        });
    }
};
