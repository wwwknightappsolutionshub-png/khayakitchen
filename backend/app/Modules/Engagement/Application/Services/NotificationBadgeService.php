<?php

namespace App\Modules\Engagement\Application\Services;

use App\Modules\CRM\Domain\Models\Customer;
use App\Modules\CRM\Domain\Models\CustomerCustomMealRequest;
use App\Modules\Orders\Domain\Models\Order;
use App\Shared\Auth\PermissionService;

class NotificationBadgeService
{
    public function __construct(
        private ChatService $chatService,
        private KitchenReviewService $kitchenReviewService,
        private PermissionService $permissionService,
    ) {}

    /**
     * Nav badge counts for the tenant admin sidebar.
     *
     * @return array{
     *   unread_customer_messages: int,
     *   unread_chat_threads: int,
     *   pending_reviews: int,
     *   pending_orders: int,
     *   kitchen_tickets: int,
     *   crm_attention: int,
     *   dashboard_attention: int
     * }
     */
    public function counts(array $permissions): array
    {
        $chat = $this->safeChatCounts($permissions);
        $pendingReviews = $this->kitchenReviewService->pendingCount();
        $pendingOrders = $this->permissionService->has($permissions, 'orders.view')
            ? Order::query()->where('status', 'pending')->count()
            : 0;

        $kitchenTickets = 0;
        if ($this->permissionService->has($permissions, 'kitchen.view')
            || $this->permissionService->has($permissions, 'orders.view')) {
            $activeOrders = Order::query()
                ->whereIn('status', ['accepted', 'preparing', 'ready'])
                ->count();
            $customMeals = CustomerCustomMealRequest::query()
                ->where('status', CustomerCustomMealRequest::STATUS_SUBMITTED)
                ->count();
            $kitchenTickets = $activeOrders + $customMeals;
        }

        $crmAttention = 0;
        if ($this->permissionService->has($permissions, 'crm.view')) {
            $crmAttention = Customer::query()
                ->where('created_at', '>=', now()->subDay())
                ->count();
        }

        $dashboardAttention = $pendingOrders
            + $kitchenTickets
            + $chat['unread_customer_messages']
            + $pendingReviews
            + $crmAttention;

        return [
            'unread_customer_messages' => $chat['unread_customer_messages'],
            'unread_chat_threads' => $chat['unread_threads'],
            'pending_reviews' => $pendingReviews,
            'pending_orders' => $pendingOrders,
            'kitchen_tickets' => $kitchenTickets,
            'crm_attention' => $crmAttention,
            'dashboard_attention' => $dashboardAttention,
        ];
    }

    /**
     * @return array{unread_customer_messages: int, unread_threads: int}
     */
    private function safeChatCounts(array $permissions): array
    {
        if (! $this->permissionService->has($permissions, 'crm.view')) {
            return ['unread_customer_messages' => 0, 'unread_threads' => 0];
        }

        return $this->chatService->customerChatBadgeCounts($permissions);
    }
}
