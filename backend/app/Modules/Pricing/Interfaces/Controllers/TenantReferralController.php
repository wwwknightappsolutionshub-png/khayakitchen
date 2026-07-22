<?php

namespace App\Modules\Pricing\Interfaces\Controllers;

use App\Modules\Pricing\Application\Services\TenantReferralService;
use App\Shared\Utils\ApiResponse;
use Illuminate\Http\Request;
use Illuminate\Routing\Controller;

class TenantReferralController extends Controller
{
    public function __construct(private TenantReferralService $referralService) {}

    public function summary(Request $request)
    {
        return ApiResponse::success(
            $this->referralService->summaryForTenant($request->get('permissions', [])),
        );
    }

    public function invite(Request $request)
    {
        $data = $request->validate([
            'email' => ['required', 'email', 'max:255'],
            'phone' => ['required', 'string', 'max:40'],
            'name' => ['nullable', 'string', 'max:120'],
            'channel' => ['nullable', 'in:email,whatsapp'],
        ]);

        $result = $this->referralService->invite(
            $request->get('permissions', []),
            $data['email'],
            $data['phone'],
            $data['name'] ?? null,
            $data['channel'] ?? 'email',
        );

        return ApiResponse::success($result, 201);
    }
}
