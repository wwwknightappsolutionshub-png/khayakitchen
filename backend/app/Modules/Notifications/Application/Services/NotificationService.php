<?php

namespace App\Modules\Notifications\Application\Services;

use App\Modules\Notifications\Domain\Models\Notification;
use App\Modules\Orders\Domain\Models\Order;
use App\Shared\Auth\PermissionService;
use App\Shared\Tenancy\TenantContext;

class NotificationService
{
    public function __construct(
        private TenantContext $tenantContext,
        private PermissionService $permissionService,
    ) {}

    public function listForUser(array $permissions)
    {
        $this->permissionService->authorize($permissions, 'notifications.view');

        $userId = $this->tenantContext->user()?->id;

        return Notification::where('user_id', $userId)
            ->orderByDesc('created_at')
            ->get();
    }

    public function markRead(string $id, array $permissions): Notification
    {
        $this->permissionService->authorize($permissions, 'notifications.view');

        $notification = Notification::findOrFail($id);
        $notification->update(['is_read' => true]);

        return $notification->fresh();
    }

    public function notifyOrderEvent(Order $order, string $type, string $message): void
    {
        Notification::create([
            'tenant_id' => $order->tenant_id,
            'user_id' => $order->created_by,
            'type' => $type,
            'message' => $message,
            'is_read' => false,
            'created_at' => now(),
        ]);
    }
}
