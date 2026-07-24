<?php

namespace App\Modules\Notifications\Interfaces\Controllers;

use App\Modules\Notifications\Application\Services\TenantWhatsAppSettingsService;
use App\Shared\Utils\ApiResponse;
use Illuminate\Http\Request;
use Illuminate\Routing\Controller;

class TenantWhatsAppSettingsController extends Controller
{
    public function __construct(private TenantWhatsAppSettingsService $settingsService) {}

    public function show()
    {
        return ApiResponse::success([
            'whatsapp' => $this->settingsService->getForCurrentTenant(),
        ]);
    }

    public function update(Request $request)
    {
        $data = $request->validate([
            'enabled' => ['sometimes', 'boolean'],
            'provider' => ['sometimes', 'in:meta,twilio'],
            'phone_number_id' => ['nullable', 'string', 'max:120'],
            'access_token' => ['nullable', 'string', 'max:2000'],
            'twilio_account_sid' => ['nullable', 'string', 'max:120'],
            'twilio_auth_token' => ['nullable', 'string', 'max:2000'],
            'twilio_from' => ['nullable', 'string', 'max:40'],
        ]);

        return ApiResponse::success([
            'whatsapp' => $this->settingsService->updateForCurrentTenant($data),
        ]);
    }
}
