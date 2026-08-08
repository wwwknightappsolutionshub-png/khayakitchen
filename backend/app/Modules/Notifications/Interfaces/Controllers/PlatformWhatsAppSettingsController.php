<?php

namespace App\Modules\Notifications\Interfaces\Controllers;

use App\Modules\Notifications\Application\Services\PlatformWhatsAppSettingsService;
use App\Shared\Utils\ApiResponse;
use Illuminate\Http\Request;
use Illuminate\Routing\Controller;

class PlatformWhatsAppSettingsController extends Controller
{
    public function __construct(private PlatformWhatsAppSettingsService $settingsService) {}

    public function show()
    {
        return ApiResponse::success([
            'whatsapp' => $this->settingsService->get(),
        ]);
    }

    public function update(Request $request)
    {
        $data = $request->validate([
            'enabled' => ['sometimes', 'boolean'],
            'provider' => ['sometimes', 'in:genius,meta,twilio'],
            'api_key' => ['nullable', 'string', 'max:2000'],
            'session_id' => ['nullable', 'string', 'max:255'],
            'base_url' => ['nullable', 'string', 'max:255', 'url'],
            'meta_phone_number_id' => ['nullable', 'string', 'max:120'],
            'meta_access_token' => ['nullable', 'string', 'max:2000'],
            'twilio_account_sid' => ['nullable', 'string', 'max:120'],
            'twilio_auth_token' => ['nullable', 'string', 'max:2000'],
            'twilio_from' => ['nullable', 'string', 'max:40'],
        ]);

        return ApiResponse::success([
            'whatsapp' => $this->settingsService->update($data),
        ]);
    }

    public function sendTest(Request $request)
    {
        $data = $request->validate([
            'phone' => ['required', 'string', 'max:40'],
            'message' => ['nullable', 'string', 'max:1000'],
        ]);

        try {
            $result = $this->settingsService->sendTestMessage(
                (string) $data['phone'],
                isset($data['message']) ? (string) $data['message'] : null,
            );
        } catch (\Illuminate\Validation\ValidationException $e) {
            throw $e;
        } catch (\Throwable $e) {
            \Illuminate\Support\Facades\Log::error('Platform WhatsApp test endpoint failed', [
                'error' => $e->getMessage(),
            ]);

            return ApiResponse::error(
                'WhatsApp test failed: '.$e->getMessage(),
                'WHATSAPP_TEST_FAILED',
                ['error' => $e->getMessage()],
                422,
            );
        }

        if (! ($result['sent'] ?? false)) {
            return ApiResponse::error(
                $result['error'] ?? 'WhatsApp test message failed.',
                'WHATSAPP_TEST_FAILED',
                $result,
                422,
            );
        }

        return ApiResponse::success($result);
    }
}
