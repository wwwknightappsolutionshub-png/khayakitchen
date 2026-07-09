<?php

namespace App\Modules\RevenueRecovery\Interfaces\Controllers;

use App\Modules\RevenueRecovery\Application\Services\CustomerLocationService;
use App\Modules\RevenueRecovery\Application\Services\ProximityEvaluationService;
use App\Modules\RevenueRecovery\Domain\Models\CustomerSession;
use App\Shared\Utils\ApiResponse;
use Illuminate\Http\Request;
use Illuminate\Routing\Controller;

class CustomerProximityController extends Controller
{
    public function __construct(
        private CustomerLocationService $locationService,
        private ProximityEvaluationService $evaluationService,
    ) {}

    public function heartbeat(Request $request)
    {
        /** @var CustomerSession $session */
        $session = $request->attributes->get('customer_session');

        $data = $request->validate([
            'lat' => ['required', 'numeric', 'between:-90,90'],
            'lng' => ['required', 'numeric', 'between:-180,180'],
            'accuracy_meters' => ['nullable', 'integer', 'min:1', 'max:10000'],
        ]);

        $result = $this->locationService->recordHeartbeat(
            $session,
            (float) $data['lat'],
            (float) $data['lng'],
            isset($data['accuracy_meters']) ? (int) $data['accuracy_meters'] : null,
        );

        return ApiResponse::success($result);
    }

    public function bait(Request $request)
    {
        /** @var CustomerSession $session */
        $session = $request->attributes->get('customer_session');

        $data = $request->validate([
            'lat' => ['required', 'numeric', 'between:-90,90'],
            'lng' => ['required', 'numeric', 'between:-180,180'],
            'accuracy_meters' => ['nullable', 'integer', 'min:1', 'max:10000'],
        ]);

        $bait = $this->evaluationService->evaluateForSession(
            $session,
            (float) $data['lat'],
            (float) $data['lng'],
            isset($data['accuracy_meters']) ? (int) $data['accuracy_meters'] : null,
        );

        return ApiResponse::success([
            'bait' => $bait,
        ]);
    }

    public function dismiss(Request $request)
    {
        /** @var CustomerSession $session */
        $session = $request->attributes->get('customer_session');

        $data = $request->validate([
            'campaign_id' => ['nullable', 'uuid'],
            'distance_km' => ['nullable', 'numeric', 'min:0'],
        ]);

        $this->evaluationService->recordDismissed(
            $session->tenant_id,
            $session->customer_id,
            $data['campaign_id'] ?? null,
            isset($data['distance_km']) ? (float) $data['distance_km'] : null,
        );

        return ApiResponse::success(['dismissed' => true]);
    }
}
