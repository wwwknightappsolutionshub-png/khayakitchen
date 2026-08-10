<?php

namespace App\Modules\NotificationsCampaign\Interfaces\Controllers;

use App\Modules\NotificationsCampaign\Application\Services\CustomerNotificationPreferenceService;
use App\Shared\Tenancy\TenantContext;
use App\Shared\Utils\ApiResponse;
use Illuminate\Http\Request;
use Illuminate\Routing\Controller;

class CustomerNotificationController extends Controller
{
    public function __construct(
        private CustomerNotificationPreferenceService $preferenceService,
        private TenantContext $tenantContext,
    ) {}

    public function upsertPreferences(Request $request)
    {
        $data = $request->validate([
            'phone' => ['required', 'string', 'max:30'],
            'name' => ['nullable', 'string', 'max:120'],
            'push_enabled' => ['required', 'boolean'],
            'whatsapp_enabled' => ['required', 'boolean'],
            'email_enabled' => ['nullable', 'boolean'],
        ]);

        $tenantId = $this->tenantContext->id();

        if (! $tenantId) {
            return ApiResponse::error('Tenant could not be resolved', 'TENANT_NOT_RESOLVED', null, 400);
        }

        if (! $data['push_enabled'] && ! $data['whatsapp_enabled']) {
            return ApiResponse::error(
                'At least one notification channel must be enabled',
                'OPT_IN_REQUIRED',
                null,
                422,
            );
        }

        $preference = $this->preferenceService->upsertByPhone(
            $tenantId,
            $data['phone'],
            $data['name'] ?? null,
            $data['push_enabled'],
            $data['whatsapp_enabled'],
            $data['email_enabled'] ?? true,
        );

        return ApiResponse::success([
            'customer_id' => $preference->customer_id,
            'preferences' => $preference,
        ]);
    }

    public function registerDeviceToken(Request $request)
    {
        $data = $request->validate([
            'customer_id' => ['required', 'uuid'],
            'device_token' => ['required', 'string'],
            'platform' => ['nullable', 'in:web'],
        ]);

        $tenantId = $this->tenantContext->id();

        if (! $tenantId) {
            return ApiResponse::error('Tenant could not be resolved', 'TENANT_NOT_RESOLVED', null, 400);
        }

        $token = $this->preferenceService->registerDeviceToken(
            $tenantId,
            $data['customer_id'],
            $data['device_token'],
            $data['platform'] ?? 'web',
        );

        return ApiResponse::success(['device_token' => $token], 201);
    }
}
