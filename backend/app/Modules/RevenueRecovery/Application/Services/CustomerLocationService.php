<?php

namespace App\Modules\RevenueRecovery\Application\Services;

use App\Modules\RevenueRecovery\Domain\Models\CustomerLocation;
use App\Modules\RevenueRecovery\Domain\Models\CustomerSession;
use App\Shared\Tenancy\TenantContext;
use Illuminate\Validation\ValidationException;

class CustomerLocationService
{
    public function __construct(
        private TenantContext $tenantContext,
        private TenantRevenueRecoverySettingsService $settingsService,
        private CustomerProximityAuthService $authService,
    ) {}

    /**
     * @return array{stored: bool, reason?: string}
     */
    public function recordHeartbeat(
        CustomerSession $session,
        float $lat,
        float $lng,
        ?int $accuracyMeters,
        string $source = 'heartbeat',
    ): array {
        if (! $session->location_opt_in) {
            throw ValidationException::withMessages([
                'location_opt_in' => ['Enable location sharing before sending coordinates.'],
            ]);
        }

        $settings = $this->settingsService->getOrCreateForTenant($this->tenantContext->id());
        $maxAccuracy = $settings->location_accuracy_max_meters;

        if ($accuracyMeters !== null && $accuracyMeters > $maxAccuracy) {
            return [
                'stored' => false,
                'reason' => 'accuracy_too_low',
            ];
        }

        CustomerLocation::create([
            'tenant_id' => $session->tenant_id,
            'customer_id' => $session->customer_id,
            'lat' => $lat,
            'lng' => $lng,
            'accuracy_meters' => $accuracyMeters,
            'source' => $source,
            'captured_at' => now(),
        ]);

        return ['stored' => true];
    }

    public function latestForCustomer(string $tenantId, string $customerId): ?CustomerLocation
    {
        return CustomerLocation::withoutGlobalScopes()
            ->where('tenant_id', $tenantId)
            ->where('customer_id', $customerId)
            ->orderByDesc('captured_at')
            ->first();
    }
}
