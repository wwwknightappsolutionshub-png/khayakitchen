<?php

namespace App\Modules\Platform\Application\Services;

use App\Modules\Platform\Domain\Models\MarketingVisitorIp;
use App\Modules\Platform\Domain\Models\MarketingVisitorStat;
use Illuminate\Support\Facades\DB;

class MarketingVisitorService
{
    public const START_COUNT = 200;

    public const INCREMENT = 10;

    /**
     * Record a visit by IP hash. New IPs (or returning after 12h) bump the public display count.
     *
     * @return array{display_count: int, incremented: bool}
     */
    public function hit(string $ip): array
    {
        $hash = hash('sha256', $ip.'|khayaos-marketing');

        return DB::transaction(function () use ($hash) {
            $stats = MarketingVisitorStat::query()->lockForUpdate()->first();
            if (! $stats) {
                $stats = MarketingVisitorStat::create([
                    'display_count' => self::START_COUNT,
                ]);
                $stats = MarketingVisitorStat::query()->lockForUpdate()->findOrFail($stats->id);
            }

            $visitor = MarketingVisitorIp::query()->where('ip_hash', $hash)->lockForUpdate()->first();
            $incremented = false;
            $now = now();

            if (! $visitor) {
                MarketingVisitorIp::create([
                    'ip_hash' => $hash,
                    'first_seen_at' => $now,
                    'last_seen_at' => $now,
                    'visit_count' => 1,
                ]);
                $stats->display_count = (int) $stats->display_count + self::INCREMENT;
                $stats->save();
                $incremented = true;
            } else {
                $shouldBump = $visitor->last_seen_at === null
                    || $visitor->last_seen_at->lte($now->copy()->subHours(12));

                $visitor->last_seen_at = $now;
                $visitor->visit_count = (int) $visitor->visit_count + 1;
                $visitor->save();

                if ($shouldBump) {
                    $stats->display_count = (int) $stats->display_count + self::INCREMENT;
                    $stats->save();
                    $incremented = true;
                }
            }

            return [
                'display_count' => max(self::START_COUNT, (int) $stats->display_count),
                'incremented' => $incremented,
            ];
        });
    }

    public function currentCount(): int
    {
        $stats = MarketingVisitorStat::query()->first();

        return max(self::START_COUNT, (int) ($stats?->display_count ?? self::START_COUNT));
    }
}
