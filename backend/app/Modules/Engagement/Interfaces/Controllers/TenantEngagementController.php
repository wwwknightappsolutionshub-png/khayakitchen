<?php

namespace App\Modules\Engagement\Interfaces\Controllers;

use App\Modules\Engagement\Application\Services\ChatService;
use App\Modules\Engagement\Application\Services\NotificationBadgeService;
use App\Modules\Engagement\Application\Services\PlatformTenantMessagingService;
use App\Modules\NotificationsCampaign\Application\Services\CustomerNotificationPreferenceService;
use App\Shared\Tenancy\TenantContext;
use App\Shared\Utils\ApiResponse;
use Illuminate\Http\Request;
use Illuminate\Routing\Controller;

class TenantEngagementController extends Controller
{
    public function __construct(
        private ChatService $chatService,
        private PlatformTenantMessagingService $messagingService,
        private CustomerNotificationPreferenceService $preferenceService,
        private TenantContext $tenantContext,
        private \App\Modules\Engagement\Application\Services\KitchenReviewService $kitchenReviewService,
        private NotificationBadgeService $notificationBadgeService,
    ) {}

    public function platformMessages(Request $request)
    {
        return ApiResponse::success([
            'messages' => $this->messagingService->listForTenant(
                $this->tenantContext->id(),
                $request->get('permissions', []),
            ),
        ]);
    }

    public function platformThreads(Request $request)
    {
        return ApiResponse::success([
            'threads' => $this->chatService->listTenantPlatformThreads($request->get('permissions', [])),
        ]);
    }

    public function customerThreads(Request $request)
    {
        return ApiResponse::success([
            'threads' => $this->chatService->listTenantCustomerThreads($request->get('permissions', [])),
        ]);
    }

    public function openCustomerThread(Request $request)
    {
        $data = $request->validate([
            'customer_id' => ['required', 'uuid'],
            'subject' => ['nullable', 'string', 'max:200'],
        ]);

        $thread = $this->chatService->openTenantCustomerThread(
            $request->get('permissions', []),
            $data['customer_id'],
            $data['subject'] ?? null,
        );

        return ApiResponse::success(['thread' => $thread], 201);
    }

    public function showThread(Request $request, string $id)
    {
        return ApiResponse::success([
            'thread' => $this->chatService->messagesForTenant($id, $request->get('permissions', [])),
        ]);
    }

    public function postMessage(Request $request, string $id)
    {
        $data = $request->validate([
            'body' => ['required', 'string', 'max:5000'],
        ]);

        $message = $this->chatService->postTenantMessage(
            $id,
            $data['body'],
            $request->get('permissions', []),
        );

        return ApiResponse::success(['message' => $message], 201);
    }

    public function setTyping(Request $request, string $id)
    {
        $data = $request->validate([
            'is_typing' => ['required', 'boolean'],
        ]);

        $this->chatService->setTenantTyping(
            $id,
            (bool) $data['is_typing'],
            $request->get('permissions', []),
        );

        return ApiResponse::success(['ok' => true]);
    }

    public function notificationBadges(Request $request)
    {
        return ApiResponse::success(
            $this->notificationBadgeService->counts($request->get('permissions', [])),
        );
    }

    public function registerDeviceToken(Request $request)
    {
        $data = $request->validate([
            'device_token' => ['required', 'string'],
            'platform' => ['nullable', 'string', 'max:32'],
        ]);

        $user = $request->user();
        $token = $this->preferenceService->registerStaffDeviceToken(
            $user->tenant_id,
            $user->id,
            $data['device_token'],
            $data['platform'] ?? 'web',
        );

        return ApiResponse::success(['device_token' => $token], 201);
    }
}
