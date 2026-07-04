<?php

namespace App\Modules\Delivery\Application\Services;

use App\Modules\Delivery\Domain\Models\DeliveryZone;
use App\Modules\Pricing\Application\Services\PlanLimitService;
use App\Shared\Auth\PermissionService;
use App\Shared\Tenancy\TenantContext;

class DeliveryZoneService
{
    public function __construct(
        private TenantContext $tenantContext,
        private PermissionService $permissionService,
        private PlanLimitService $planLimitService,
    ) {}

    public function list(array $permissions)
    {
        $this->permissionService->authorize($permissions, 'delivery.manage');

        return DeliveryZone::orderBy('name')->get();
    }

    public function create(array $data, array $permissions): DeliveryZone
    {
        $this->permissionService->authorize($permissions, 'delivery.manage');
        $this->planLimitService->assertDeliveryZoneLimit();

        return DeliveryZone::create([
            'tenant_id' => $this->tenantContext->id(),
            'name' => $data['name'],
            'fee' => $data['fee'] ?? 0,
            'postcodes' => $data['postcodes'] ?? [],
        ]);
    }

    public function update(string $id, array $data, array $permissions): DeliveryZone
    {
        $this->permissionService->authorize($permissions, 'delivery.manage');

        $zone = DeliveryZone::findOrFail($id);
        $zone->update(array_filter([
            'name' => $data['name'] ?? null,
            'fee' => $data['fee'] ?? null,
            'postcodes' => $data['postcodes'] ?? null,
        ], fn ($v) => $v !== null));

        return $zone->fresh();
    }

    public function delete(string $id, array $permissions): void
    {
        $this->permissionService->authorize($permissions, 'delivery.manage');

        DeliveryZone::findOrFail($id)->delete();
    }
}
