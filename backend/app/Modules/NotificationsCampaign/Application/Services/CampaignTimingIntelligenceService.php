<?php

namespace App\Modules\NotificationsCampaign\Application\Services;

use App\Modules\Auth\Domain\Models\Tenant;
use App\Modules\Engagement\Application\Services\PlatformTenantMessagingService;
use App\Modules\Engagement\Domain\Models\PlatformTenantMessage;
use App\Modules\NotificationsCampaign\Domain\Models\TenantSalesRhythmSummary;
use App\Modules\Orders\Domain\Models\Order;
use App\Modules\Pricing\Application\Services\AuditLogService;
use App\Shared\Entitlements\FeatureAccessService;
use Carbon\Carbon;
use Illuminate\Support\Facades\Log;

/**
 * Learns each tenant's completed-order rhythm (weekday × hour in local TZ) and
 * auto-suggests campaign timing via platform_tenant_messages channel=suggestion.
 *
 * Peak rule: among cells with count ≥ min_cell_orders, peak = count ≥ P75;
 * off-peak = count ≤ P25 (and not peak).
 */
class CampaignTimingIntelligenceService
{
    public const FEATURE_KEY = 'campaign_timing_intelligence';

    public const CHANNEL_SUGGESTION = 'suggestion';

    private const WEEKDAY_LABELS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

    public function __construct(
        private FeatureAccessService $featureAccessService,
        private PlatformTenantMessagingService $messagingService,
        private AuditLogService $auditLogService,
    ) {}

    /**
     * Scheduled entry: refresh + suggest for all eligible active tenants.
     */
    public function processDueSuggestions(?Carbon $nowUtc = null): int
    {
        $nowUtc = $nowUtc?->copy()->utc() ?? now()->utc();
        $created = 0;

        $tenants = Tenant::query()
            ->where('status', 'active')
            ->orderBy('id')
            ->get();

        foreach ($tenants as $tenant) {
            try {
                if (! $this->featureAccessService->canAccess(self::FEATURE_KEY, $tenant->id)) {
                    continue;
                }

                $message = $this->evaluateTenant($tenant, $nowUtc);
                if ($message) {
                    $created++;
                }
            } catch (\Throwable $e) {
                Log::warning('campaign_timing.tenant_failed', [
                    'tenant_id' => $tenant->id,
                    'error' => $e->getMessage(),
                ]);
            }
        }

        return $created;
    }

    /**
     * Recompute + optionally emit one suggestion for a tenant.
     */
    public function evaluateTenant(Tenant $tenant, ?Carbon $nowUtc = null): ?PlatformTenantMessage
    {
        $nowUtc = $nowUtc?->copy()->utc() ?? now()->utc();
        $summary = $this->ensureFreshSummary($tenant);

        if (! $summary || (int) $summary->order_count < $this->minOrders()) {
            return null;
        }

        if ($this->suggestionCountToday($tenant, $nowUtc) >= $this->maxPerDay()) {
            return null;
        }

        $tz = $this->resolveTimezone($tenant);
        $local = $nowUtc->copy()->timezone($tz);
        $matrix = $summary->matrix ?? [];
        $peakKeys = $matrix['peak_keys'] ?? [];
        $offPeakKeys = $matrix['off_peak_keys'] ?? [];
        $peakWindows = $matrix['peak_windows'] ?? [];

        $window = $this->matchingPeakWindow($peakWindows, $local, $peakKeys);
        if ($window !== null) {
            return $this->emitPeakSuggestion($tenant, $window, $local, $nowUtc);
        }

        $key = $this->cellKey((int) $local->dayOfWeek, (int) $local->hour);
        if (in_array($key, $offPeakKeys, true) && ! in_array($key, $peakKeys, true)) {
            return $this->emitOffPeakSuggestion($tenant, $local, $nowUtc);
        }

        return null;
    }

    /**
     * Force recompute of the persisted rhythm for a tenant.
     */
    public function recomputeSummary(Tenant $tenant): ?TenantSalesRhythmSummary
    {
        $tz = $this->resolveTimezone($tenant);
        $lookbackDays = $this->lookbackDays();
        $since = now()->utc()->subDays($lookbackDays);

        $orders = Order::withoutGlobalScopes()
            ->where('tenant_id', $tenant->id)
            ->where('status', 'completed')
            ->where('created_at', '>=', $since)
            ->get(['id', 'created_at']);

        $cells = [];
        foreach ($orders as $order) {
            $local = Carbon::parse($order->created_at)->utc()->timezone($tz);
            $key = $this->cellKey((int) $local->dayOfWeek, (int) $local->hour);
            $cells[$key] = ($cells[$key] ?? 0) + 1;
        }

        $classified = $this->classifyCells($cells);
        $peakWindows = $this->buildPeakWindows($classified['peak_keys']);

        $payload = [
            'cells' => $cells,
            'peak_keys' => $classified['peak_keys'],
            'off_peak_keys' => $classified['off_peak_keys'],
            'peak_windows' => $peakWindows,
            'rule' => 'P75 peak / P25 off-peak among cells with count >= min_cell_orders',
            'min_cell_orders' => $this->minCellOrders(),
        ];

        $summary = TenantSalesRhythmSummary::withoutGlobalScopes()->updateOrCreate(
            ['tenant_id' => $tenant->id],
            [
                'lookback_days' => $lookbackDays,
                'order_count' => $orders->count(),
                'timezone' => $tz,
                'matrix' => $payload,
                'computed_at' => now(),
            ],
        );

        return $summary;
    }

    public function ensureFreshSummary(Tenant $tenant): ?TenantSalesRhythmSummary
    {
        $existing = TenantSalesRhythmSummary::withoutGlobalScopes()
            ->where('tenant_id', $tenant->id)
            ->first();

        $ttlHours = (int) config('campaign_timing.summary_ttl_hours', 24);
        if (
            $existing
            && $existing->computed_at
            && $existing->computed_at->gt(now()->subHours($ttlHours))
        ) {
            return $existing;
        }

        return $this->recomputeSummary($tenant);
    }

    /**
     * @param  array<string, int>  $cells
     * @return array{peak_keys: list<string>, off_peak_keys: list<string>}
     */
    public function classifyCells(array $cells): array
    {
        $minCell = $this->minCellOrders();
        $eligible = array_filter($cells, fn (int $count) => $count >= $minCell);

        if ($eligible === []) {
            return ['peak_keys' => [], 'off_peak_keys' => []];
        }

        $counts = array_values($eligible);
        sort($counts);
        $p75 = $this->percentile($counts, 0.75);
        $p25 = $this->percentile($counts, 0.25);

        $peakKeys = [];
        $offPeakKeys = [];
        foreach ($eligible as $key => $count) {
            if ($count >= $p75) {
                $peakKeys[] = $key;
            }
            if ($count <= $p25) {
                $offPeakKeys[] = $key;
            }
        }

        // Prefer peak over off-peak when a cell sits on both edges of a flat distribution.
        $offPeakKeys = array_values(array_diff($offPeakKeys, $peakKeys));

        return [
            'peak_keys' => array_values($peakKeys),
            'off_peak_keys' => $offPeakKeys,
        ];
    }

    public function cellKey(int $weekday, int $hour): string
    {
        return $weekday.'-'.$hour;
    }

    /**
     * @param  list<string>  $peakKeys
     * @return list<array{weekday: int, start_hour: int, end_hour: int, label: string}>
     */
    public function buildPeakWindows(array $peakKeys): array
    {
        $byDay = [];
        foreach ($peakKeys as $key) {
            [$weekday, $hour] = array_map('intval', explode('-', $key));
            $byDay[$weekday][] = $hour;
        }

        $windows = [];
        foreach ($byDay as $weekday => $hours) {
            sort($hours);
            $hours = array_values(array_unique($hours));
            $start = $hours[0];
            $prev = $hours[0];
            for ($i = 1; $i <= count($hours); $i++) {
                $done = $i === count($hours);
                $hour = $done ? null : $hours[$i];
                if ($done || $hour !== $prev + 1) {
                    $end = $prev;
                    $dayLabel = self::WEEKDAY_LABELS[$weekday] ?? (string) $weekday;
                    $windows[] = [
                        'weekday' => $weekday,
                        'start_hour' => $start,
                        'end_hour' => $end,
                        'label' => sprintf(
                            '%s %02d:00–%02d:00',
                            $dayLabel,
                            $start,
                            $end + 1 > 23 ? 24 : $end + 1,
                        ),
                    ];
                    if (! $done) {
                        $start = $hour;
                        $prev = $hour;
                    }
                } else {
                    $prev = $hour;
                }
            }
        }

        return $windows;
    }

    /**
     * @param  list<array{weekday: int, start_hour: int, end_hour: int, label: string}>  $peakWindows
     * @param  list<string>  $peakKeys
     * @return array{weekday: int, start_hour: int, end_hour: int, label: string}|null
     */
    private function matchingPeakWindow(array $peakWindows, Carbon $local, array $peakKeys): ?array
    {
        $weekday = (int) $local->dayOfWeek;
        $hour = (int) $local->hour;
        $minute = (int) $local->minute;
        $prePeak = $this->prePeakMinutes();

        foreach ($peakWindows as $window) {
            if ((int) $window['weekday'] !== $weekday) {
                continue;
            }
            $start = (int) $window['start_hour'];
            $end = (int) $window['end_hour'];

            if ($hour >= $start && $hour <= $end) {
                return $window;
            }

            // Pre-peak nudge in the hour before the block starts.
            if ($start > 0 && $hour === $start - 1 && $minute >= max(0, 60 - $prePeak)) {
                return $window;
            }
        }

        $key = $this->cellKey($weekday, $hour);
        if (in_array($key, $peakKeys, true)) {
            $dayLabel = self::WEEKDAY_LABELS[$weekday] ?? (string) $weekday;

            return [
                'weekday' => $weekday,
                'start_hour' => $hour,
                'end_hour' => $hour,
                'label' => sprintf('%s %02d:00–%02d:00', $dayLabel, $hour, $hour + 1),
            ];
        }

        return null;
    }

    /**
     * @param  array{weekday: int, start_hour: int, end_hour: int, label: string}  $window
     */
    private function emitPeakSuggestion(
        Tenant $tenant,
        array $window,
        Carbon $local,
        Carbon $nowUtc,
    ): PlatformTenantMessage {
        $title = 'Good time to push a campaign';
        $body = sprintf(
            'Your usual %s rush is approaching (based on completed orders over the last %d days). Open Marketing to create a push campaign while diners are active.',
            $window['label'],
            $this->lookbackDays(),
        );

        return $this->deliverSuggestion($tenant, $title, $body, [
            'kind' => 'peak',
            'window' => $window,
            'cta_path' => '/marketing',
            'local_at' => $local->toIso8601String(),
        ], $nowUtc);
    }

    private function emitOffPeakSuggestion(
        Tenant $tenant,
        Carbon $local,
        Carbon $nowUtc,
    ): PlatformTenantMessage {
        $dayLabel = self::WEEKDAY_LABELS[(int) $local->dayOfWeek] ?? '';
        $title = 'Quiet window — consider a recovery offer';
        $body = sprintf(
            '%s around %02d:00 is typically quieter for your kitchen. A recovery or bait promo can wake demand — open Marketing when you are ready.',
            $dayLabel,
            (int) $local->hour,
        );

        return $this->deliverSuggestion($tenant, $title, $body, [
            'kind' => 'off_peak',
            'cta_path' => '/marketing',
            'local_at' => $local->toIso8601String(),
        ], $nowUtc);
    }

    /**
     * @param  array<string, mixed>  $metadata
     */
    private function deliverSuggestion(
        Tenant $tenant,
        string $title,
        string $body,
        array $metadata,
        Carbon $nowUtc,
    ): PlatformTenantMessage {
        $message = $this->messagingService->createSystemSuggestion(
            $tenant->id,
            $title,
            $body,
            $metadata,
            $nowUtc,
        );

        $this->auditLogService->log(
            'campaign_timing.suggestion_created',
            $tenant->id,
            null,
            'platform_tenant_message',
            $message->id,
            [
                'kind' => $metadata['kind'] ?? null,
                'title' => $title,
            ],
        );

        return $message;
    }

    private function suggestionCountToday(Tenant $tenant, Carbon $nowUtc): int
    {
        $tz = $this->resolveTimezone($tenant);
        $startLocal = $nowUtc->copy()->timezone($tz)->startOfDay();
        $endLocal = $startLocal->copy()->endOfDay();

        return PlatformTenantMessage::withoutGlobalScopes()
            ->where('tenant_id', $tenant->id)
            ->where('channel', self::CHANNEL_SUGGESTION)
            ->where('created_at', '>=', $startLocal->copy()->utc())
            ->where('created_at', '<=', $endLocal->copy()->utc())
            ->count();
    }

    private function resolveTimezone(Tenant $tenant): string
    {
        $tz = trim((string) ($tenant->timezone ?: ''));
        if ($tz === '') {
            return (string) config('campaign_timing.fallback_timezone', 'UTC');
        }

        try {
            new \DateTimeZone($tz);

            return $tz;
        } catch (\Throwable) {
            return (string) config('campaign_timing.fallback_timezone', 'UTC');
        }
    }

    /** @param  list<int>  $sortedAscending */
    private function percentile(array $sortedAscending, float $p): float
    {
        $n = count($sortedAscending);
        if ($n === 1) {
            return (float) $sortedAscending[0];
        }
        $idx = ($n - 1) * $p;
        $lo = (int) floor($idx);
        $hi = (int) ceil($idx);
        if ($lo === $hi) {
            return (float) $sortedAscending[$lo];
        }
        $w = $idx - $lo;

        return $sortedAscending[$lo] * (1 - $w) + $sortedAscending[$hi] * $w;
    }

    private function lookbackDays(): int
    {
        return max(7, (int) config('campaign_timing.lookback_days', 42));
    }

    private function minOrders(): int
    {
        return max(1, (int) config('campaign_timing.min_orders', 20));
    }

    private function minCellOrders(): int
    {
        return max(1, (int) config('campaign_timing.min_cell_orders', 2));
    }

    private function prePeakMinutes(): int
    {
        return max(0, (int) config('campaign_timing.pre_peak_minutes', 45));
    }

    private function maxPerDay(): int
    {
        return max(1, (int) config('campaign_timing.max_suggestions_per_day', 1));
    }
}
