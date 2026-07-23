<?php

namespace App\Modules\Platform\Application\Services;

use App\Modules\Auth\Domain\Models\User;
use App\Modules\CRM\Domain\Models\Customer;
use App\Modules\Pricing\Application\Services\AuditLogService;
use Carbon\CarbonInterface;
use Illuminate\Support\Carbon;

class TenantPresenceService
{
    public const ONLINE_SECONDS = 120;

    public const AWAY_SECONDS = 900;

    public function __construct(private AuditLogService $auditLogService) {}

    /**
     * @return array{last_seen_at: string, presence: string}
     */
    public function heartbeat(User $user): array
    {
        if (! $user->tenant_id) {
            abort(403, 'Presence heartbeat is for tenant staff only');
        }

        $user->last_seen_at = now();
        $user->save();

        return [
            'last_seen_at' => $user->last_seen_at->toIso8601String(),
            'presence' => self::STATUS_ONLINE,
        ];
    }

    /**
     * Persist staff admin PWA install (idempotent).
     *
     * @return array{pwa_installed_at: string, already_claimed: bool}
     */
    public function claimStaffPwa(User $user): array
    {
        if (! $user->tenant_id) {
            abort(403, 'Staff PWA claim is for tenant staff only');
        }

        $already = $user->pwa_installed_at !== null;
        if (! $already) {
            $user->pwa_installed_at = now();
            $user->save();

            $this->auditLogService->log(
                'staff.pwa_installed',
                $user->tenant_id,
                $user->id,
                'user',
                $user->id,
                [],
            );
        }

        return [
            'pwa_installed_at' => $user->fresh()->pwa_installed_at?->toIso8601String() ?? now()->toIso8601String(),
            'already_claimed' => $already,
        ];
    }

    public const STATUS_ONLINE = 'online';

    public const STATUS_AWAY = 'away';

    public const STATUS_OFFLINE = 'offline';

    public static function statusFromLastSeen(?CarbonInterface $lastSeen): string
    {
        if (! $lastSeen) {
            return self::STATUS_OFFLINE;
        }

        $age = now()->diffInSeconds($lastSeen);
        if ($age <= self::ONLINE_SECONDS) {
            return self::STATUS_ONLINE;
        }
        if ($age <= self::AWAY_SECONDS) {
            return self::STATUS_AWAY;
        }

        return self::STATUS_OFFLINE;
    }

    /**
     * @return array{
     *   tenants_online: int,
     *   tenants_away: int,
     *   tenants_with_staff_pwa: int,
     *   customers_with_pwa: int,
     *   tenants_with_customer_pwa: int
     * }
     */
    public function platformAggregates(): array
    {
        $staffByTenant = User::withoutGlobalScopes()
            ->whereNotNull('tenant_id')
            ->selectRaw('tenant_id, MAX(last_seen_at) as last_seen_at, COUNT(pwa_installed_at) as staff_pwa_count')
            ->groupBy('tenant_id')
            ->get();

        $tenantsOnline = 0;
        $tenantsAway = 0;
        $tenantsWithStaffPwa = 0;

        foreach ($staffByTenant as $row) {
            $status = self::statusFromLastSeen(
                $row->last_seen_at ? Carbon::parse($row->last_seen_at) : null
            );
            if ($status === self::STATUS_ONLINE) {
                $tenantsOnline++;
            } elseif ($status === self::STATUS_AWAY) {
                $tenantsAway++;
            }
            if ((int) $row->staff_pwa_count > 0) {
                $tenantsWithStaffPwa++;
            }
        }

        $customersWithPwa = Customer::withoutGlobalScopes()
            ->whereNotNull('app_installed_at')
            ->count();

        $tenantsWithCustomerPwa = Customer::withoutGlobalScopes()
            ->whereNotNull('app_installed_at')
            ->distinct()
            ->count('tenant_id');

        return [
            'tenants_online' => $tenantsOnline,
            'tenants_away' => $tenantsAway,
            'tenants_with_staff_pwa' => $tenantsWithStaffPwa,
            'customers_with_pwa' => $customersWithPwa,
            'tenants_with_customer_pwa' => $tenantsWithCustomerPwa,
        ];
    }

    /**
     * Staff + customer presence/PWA stats keyed by tenant_id.
     *
     * @return array<string, object>
     */
    public function statsByTenantId(): array
    {
        $staff = User::withoutGlobalScopes()
            ->whereNotNull('tenant_id')
            ->selectRaw('tenant_id, MAX(last_seen_at) as last_seen_at, MAX(last_login_at) as last_login_at, COUNT(pwa_installed_at) as staff_pwa_count')
            ->groupBy('tenant_id')
            ->get()
            ->keyBy('tenant_id');

        $customers = Customer::withoutGlobalScopes()
            ->whereNotNull('app_installed_at')
            ->selectRaw('tenant_id, COUNT(*) as customer_pwa_count')
            ->groupBy('tenant_id')
            ->get()
            ->keyBy('tenant_id');

        $merged = [];
        foreach ($staff as $tenantId => $row) {
            $merged[$tenantId] = (object) [
                'last_seen_at' => $row->last_seen_at,
                'last_login_at' => $row->last_login_at,
                'staff_pwa_count' => (int) $row->staff_pwa_count,
                'customer_pwa_count' => (int) ($customers[$tenantId]->customer_pwa_count ?? 0),
            ];
        }
        foreach ($customers as $tenantId => $row) {
            if (! isset($merged[$tenantId])) {
                $merged[$tenantId] = (object) [
                    'last_seen_at' => null,
                    'last_login_at' => null,
                    'staff_pwa_count' => 0,
                    'customer_pwa_count' => (int) $row->customer_pwa_count,
                ];
            }
        }

        return $merged;
    }

    /**
     * @param  array<string, object|null>  $statsByTenant  keyed by tenant_id
     * @return array<string, mixed>
     */
    public function formatPresenceFields(string $tenantId, array $statsByTenant, ?CarbonInterface $lastPokedAt): array
    {
        $stats = $statsByTenant[$tenantId] ?? null;
        $lastSeen = isset($stats?->last_seen_at) ? Carbon::parse($stats->last_seen_at) : null;
        $lastLogin = isset($stats?->last_login_at) ? Carbon::parse($stats->last_login_at) : null;

        return [
            'presence' => self::statusFromLastSeen($lastSeen),
            'last_seen_at' => $lastSeen?->toIso8601String(),
            'last_login_at' => $lastLogin?->toIso8601String(),
            'staff_pwa_installed' => (int) ($stats->staff_pwa_count ?? 0) > 0,
            'staff_pwa_installs' => (int) ($stats->staff_pwa_count ?? 0),
            'customer_pwa_installs' => (int) ($stats->customer_pwa_count ?? 0),
            'last_poked_at' => $lastPokedAt?->toIso8601String(),
        ];
    }
}
