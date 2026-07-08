<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    /**
     * Align all subscription plans to the KhayaOS orange brand color.
     */
    public function up(): void
    {
        DB::table('plans')->update(['plan_color' => '#E07A5F']);
    }

    public function down(): void
    {
        // Restore the original per-plan palette by slug where present.
        $originalColors = [
            'starter' => '#E07A5F',
            'growth' => '#81B29A',
            'professional' => '#004D40',
            'enterprise' => '#1a1a2e',
        ];

        foreach ($originalColors as $slug => $color) {
            DB::table('plans')->where('slug', $slug)->update(['plan_color' => $color]);
        }
    }
};
