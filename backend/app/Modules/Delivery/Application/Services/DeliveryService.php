<?php

namespace App\Modules\Delivery\Application\Services;

use App\Modules\Delivery\Domain\Models\DeliveryOrder;
use App\Modules\Orders\Domain\Models\Order;
use App\Shared\Auth\PermissionService;
use App\Shared\Tenancy\TenantContext;

class DeliveryService
{
    public function __construct(
        private TenantContext $tenantContext,
        private PermissionService $permissionService,
    ) {}

    public function create(array $data, array $permissions): DeliveryOrder
    {
        $this->permissionService->authorize($permissions, 'delivery.manage');

        Order::findOrFail($data['order_id']);

        return DeliveryOrder::create([
            'tenant_id' => $this->tenantContext->id(),
            'order_id' => $data['order_id'],
            'status' => 'pending',
            'driver_name' => $data['driver_name'] ?? null,
        ]);
    }

    public function updateStatus(string $id, string $status, array $permissions): DeliveryOrder
    {
        $this->permissionService->authorize($permissions, 'delivery.manage');

        $delivery = DeliveryOrder::findOrFail($id);
        $delivery->update([
            'status' => $status,
            'driver_name' => $delivery->driver_name,
        ]);

        return $delivery->fresh();
    }
}
