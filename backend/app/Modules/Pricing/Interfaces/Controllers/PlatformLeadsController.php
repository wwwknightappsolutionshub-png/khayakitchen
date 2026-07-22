<?php

namespace App\Modules\Pricing\Interfaces\Controllers;

use App\Modules\Pricing\Application\Services\TenantReferralService;
use App\Shared\Utils\ApiResponse;
use Illuminate\Http\Request;
use Illuminate\Routing\Controller;

class PlatformLeadsController extends Controller
{
    public function __construct(private TenantReferralService $referralService) {}

    public function index(Request $request)
    {
        $data = $request->validate([
            'status' => ['nullable', 'in:invited,clicked,signed_up,rewarded,rejected,expired'],
            'search' => ['nullable', 'string', 'max:120'],
            'from' => ['nullable', 'date'],
            'to' => ['nullable', 'date'],
            'referrer_tenant_id' => ['nullable', 'uuid'],
            'referrer' => ['nullable', 'string', 'max:120'],
            'page' => ['nullable', 'integer', 'min:1'],
            'per_page' => ['nullable', 'integer', 'min:1', 'max:100'],
        ]);

        return ApiResponse::success(
            $this->referralService->listLeadsForPlatform(
                $data['status'] ?? null,
                $data['search'] ?? null,
                $data['from'] ?? null,
                $data['to'] ?? null,
                (int) ($data['page'] ?? 1),
                (int) ($data['per_page'] ?? 50),
                $data['referrer_tenant_id'] ?? null,
                $data['referrer'] ?? null,
            ),
        );
    }
}
