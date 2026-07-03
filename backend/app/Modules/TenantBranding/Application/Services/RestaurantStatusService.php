<?php

namespace App\Modules\TenantBranding\Application\Services;

use App\Modules\Pricing\Application\Services\AuditLogService;
use App\Modules\TenantBranding\Domain\Models\RestaurantStatus;
use App\Modules\TenantBranding\Events\PromoModeActivated;
use App\Modules\TenantBranding\Events\RestaurantStatusChanged;
use App\Shared\Auth\PermissionService;
use App\Shared\Tenancy\TenantContext;
use Illuminate\Validation\ValidationException;

class RestaurantStatusService
{
    public function __construct(
        private TenantContext $tenantContext,
        private PermissionService $permissionService,
        private AuditLogService $auditLogService,
    ) {}

    public function getForTenant(?string $tenantId = null): RestaurantStatus
    {
        $tenantId = $tenantId ?? $this->tenantContext->id();

        return RestaurantStatus::withoutGlobalScopes()->firstOrCreate(
            ['tenant_id' => $tenantId],
            [
                'status' => RestaurantStatus::STATUS_OPEN,
                'is_accepting_orders' => true,
                'promo_alerts_enabled' => true,
            ],
        );
    }

    public function isAcceptingOrders(?string $tenantId = null): bool
    {
        return $this->getForTenant($tenantId)->is_accepting_orders;
    }

    public function assertAcceptingOrders(?string $tenantId = null): void
    {
        $status = $this->getForTenant($tenantId);

        if (! $status->is_accepting_orders) {
            throw ValidationException::withMessages([
                'status' => ['Restaurant is currently closed and not accepting orders.'],
            ]);
        }
    }

    public function updateStatus(
        string $status,
        array $permissions,
        ?bool $promoAlertsEnabled = null,
        ?string $reason = null,
        bool $isSuperAdminOverride = false,
    ): RestaurantStatus {
        if (! $isSuperAdminOverride) {
            $this->permissionService->authorize($permissions, 'branding.manage');
        }

        $valid = [
            RestaurantStatus::STATUS_OPEN,
            RestaurantStatus::STATUS_CLOSING_SOON,
            RestaurantStatus::STATUS_CLOSED,
            RestaurantStatus::STATUS_PROMO_MODE,
        ];

        if (! in_array($status, $valid, true)) {
            throw ValidationException::withMessages(['status' => ['Invalid restaurant status.']]);
        }

        $record = $this->getForTenant();
        $previous = $record->status;

        if ($previous === $status) {
            return $record;
        }

        $isAccepting = ! in_array($status, [RestaurantStatus::STATUS_CLOSED], true);

        $record->update([
            'status' => $status,
            'is_accepting_orders' => $isAccepting,
            'previous_status' => $previous,
            'updated_by' => $this->tenantContext->user()?->id,
            'promo_alerts_enabled' => $promoAlertsEnabled ?? $record->promo_alerts_enabled,
        ]);

        $action = $isSuperAdminOverride ? 'status.override' : 'status.changed';
        $this->auditLogService->log(
            $action,
            $record->tenant_id,
            $this->tenantContext->user()?->id,
            'restaurant_status',
            $record->id,
            ['from' => $previous, 'to' => $status],
            $reason,
        );

        RestaurantStatusChanged::dispatch($record->fresh(), $previous);

        if ($status === RestaurantStatus::STATUS_PROMO_MODE && $previous !== RestaurantStatus::STATUS_PROMO_MODE) {
            PromoModeActivated::dispatch($record->fresh());
        }

        return $record->fresh();
    }

    public function getStorefront(?string $tenantId = null): array
    {
        $tenantId = $tenantId ?? $this->tenantContext->id();
        $brandingService = app(BrandingService::class);
        $branding = $brandingService->getForTenant($tenantId);
        $status = $this->getForTenant($tenantId);

        return [
            'branding' => $brandingService->resolveEffective($branding),
            'status' => $status,
        ];
    }
}
