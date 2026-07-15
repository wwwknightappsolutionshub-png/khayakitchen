<?php

namespace App\Modules\Loyalty\Interfaces\Controllers;

use App\Modules\Loyalty\Application\Services\LoyaltyProgramService;
use App\Modules\Loyalty\Application\Services\LoyaltyService;
use App\Shared\Utils\ApiResponse;
use Illuminate\Http\Request;
use Illuminate\Routing\Controller;

class LoyaltyProgramController extends Controller
{
    public function __construct(
        private LoyaltyProgramService $loyaltyProgramService,
        private LoyaltyService $loyaltyService,
    ) {}

    public function dashboard(Request $request)
    {
        return ApiResponse::success(
            $this->loyaltyProgramService->dashboard($request->get('permissions', [])),
        );
    }

    public function updateSettings(Request $request)
    {
        $data = $request->validate([
            'enrollments_paused' => ['nullable', 'boolean'],
            'referral_stamp_credit' => ['nullable', 'integer', 'min:0', 'max:50'],
            'referral_points_credit' => ['nullable', 'integer', 'min:0', 'max:10000'],
            'near_goal_threshold_percent' => ['nullable', 'integer', 'min:50', 'max:99'],
        ]);

        return ApiResponse::success([
            'settings' => $this->loyaltyProgramService->updateSettings($data, $request->get('permissions', [])),
        ]);
    }

    public function storePackage(Request $request)
    {
        $data = $request->validate([
            'name' => ['required', 'string', 'max:120'],
            'description' => ['nullable', 'string', 'max:500'],
            'package_type' => ['required', 'in:stamp,points'],
            'goal_value' => ['required', 'integer', 'min:1', 'max:100000'],
            'reward_type' => ['required', 'in:free_meal,percent_off,fixed_credit,custom'],
            'reward_value' => ['nullable', 'numeric', 'min:0'],
            'reward_label' => ['required', 'string', 'max:160'],
            'is_active' => ['nullable', 'boolean'],
            'sort_order' => ['nullable', 'integer', 'min:0'],
        ]);

        return ApiResponse::success([
            'package' => $this->loyaltyProgramService->createPackage($data, $request->get('permissions', [])),
        ], 201);
    }

    public function updatePackage(Request $request, string $id)
    {
        $data = $request->validate([
            'name' => ['sometimes', 'string', 'max:120'],
            'description' => ['nullable', 'string', 'max:500'],
            'package_type' => ['sometimes', 'in:stamp,points'],
            'goal_value' => ['sometimes', 'integer', 'min:1', 'max:100000'],
            'reward_type' => ['sometimes', 'in:free_meal,percent_off,fixed_credit,custom'],
            'reward_value' => ['nullable', 'numeric', 'min:0'],
            'reward_label' => ['sometimes', 'string', 'max:160'],
            'is_active' => ['nullable', 'boolean'],
            'sort_order' => ['nullable', 'integer', 'min:0'],
        ]);

        return ApiResponse::success([
            'package' => $this->loyaltyProgramService->updatePackage($id, $data, $request->get('permissions', [])),
        ]);
    }

    public function destroyPackage(Request $request, string $id)
    {
        $this->loyaltyProgramService->deletePackage($id, $request->get('permissions', []));

        return ApiResponse::success(['deleted' => true]);
    }

    public function notifyQualified(Request $request)
    {
        $data = $request->validate([
            'audience' => ['nullable', 'in:eligible_or_active,eligible,active'],
        ]);

        return ApiResponse::success(
            $this->loyaltyProgramService->notifyQualified(
                $request->get('permissions', []),
                $data['audience'] ?? 'eligible_or_active',
            ),
        );
    }
}
