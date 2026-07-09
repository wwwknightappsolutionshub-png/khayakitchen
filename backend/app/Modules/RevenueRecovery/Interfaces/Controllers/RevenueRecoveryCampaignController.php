<?php

namespace App\Modules\RevenueRecovery\Interfaces\Controllers;

use App\Modules\RevenueRecovery\Application\Services\RevenueRecoveryCampaignService;
use App\Shared\Utils\ApiResponse;
use Illuminate\Http\Request;
use Illuminate\Routing\Controller;

class RevenueRecoveryCampaignController extends Controller
{
    public function __construct(private RevenueRecoveryCampaignService $service) {}

    public function dashboard(Request $request)
    {
        return ApiResponse::success($this->service->getDashboard($request->get('permissions', [])));
    }

    public function index(Request $request)
    {
        return ApiResponse::success([
            'campaigns' => $this->service->list($request->get('permissions', []), $request->query('status')),
        ]);
    }

    public function show(string $id, Request $request)
    {
        return ApiResponse::success([
            'campaign' => $this->service->show($id, $request->get('permissions', [])),
        ]);
    }

    public function store(Request $request)
    {
        $data = $request->validate([
            'name' => ['required', 'string', 'max:120'],
            'campaign_type' => ['required', 'in:closing_soon,happy_hour,slow_period,custom,proximity'],
            'discount_type' => ['required_unless:campaign_type,proximity', 'in:percent,fixed'],
            'discount_value' => ['required_unless:campaign_type,proximity', 'numeric', 'min:0.01'],
            'meal_ids' => ['required_unless:campaign_type,proximity', 'array'],
            'meal_ids.*' => ['uuid'],
            'starts_at' => ['required', 'date'],
            'ends_at' => ['required', 'date', 'after:starts_at'],
            'notifications_enabled' => ['nullable', 'boolean'],
            'notification_title' => ['nullable', 'string', 'max:120'],
            'notification_message' => ['nullable', 'string', 'max:500'],
            'target_audience' => ['nullable', 'in:all,repeat_customers,active_customers'],
            'redemption_limit' => ['nullable', 'integer', 'min:1'],
            'proximity_bait_tiers' => ['nullable', 'array'],
            'proximity_bait_tiers.*.min_km' => ['required_with:proximity_bait_tiers', 'numeric', 'min:0'],
            'proximity_bait_tiers.*.max_km' => ['required_with:proximity_bait_tiers', 'numeric', 'min:0'],
            'proximity_bait_tiers.*.urgency_label' => ['required_with:proximity_bait_tiers', 'string', 'max:120'],
        ]);

        return ApiResponse::success([
            'campaign' => $this->service->create($data, $request->get('permissions', [])),
        ], 201);
    }

    public function update(string $id, Request $request)
    {
        $data = $request->validate([
            'name' => ['sometimes', 'string', 'max:120'],
            'campaign_type' => ['sometimes', 'in:closing_soon,happy_hour,slow_period,custom,proximity'],
            'discount_type' => ['sometimes', 'in:percent,fixed'],
            'discount_value' => ['sometimes', 'numeric', 'min:0'],
            'meal_ids' => ['sometimes', 'array'],
            'meal_ids.*' => ['uuid'],
            'starts_at' => ['sometimes', 'date'],
            'ends_at' => ['sometimes', 'date', 'after:starts_at'],
            'notifications_enabled' => ['nullable', 'boolean'],
            'notification_title' => ['nullable', 'string', 'max:120'],
            'notification_message' => ['nullable', 'string', 'max:500'],
            'target_audience' => ['nullable', 'in:all,repeat_customers,active_customers'],
            'redemption_limit' => ['nullable', 'integer', 'min:1'],
            'proximity_bait_tiers' => ['nullable', 'array'],
            'proximity_bait_tiers.*.min_km' => ['required_with:proximity_bait_tiers', 'numeric', 'min:0'],
            'proximity_bait_tiers.*.max_km' => ['required_with:proximity_bait_tiers', 'numeric', 'min:0'],
            'proximity_bait_tiers.*.urgency_label' => ['required_with:proximity_bait_tiers', 'string', 'max:120'],
        ]);

        return ApiResponse::success([
            'campaign' => $this->service->update($id, $data, $request->get('permissions', [])),
        ]);
    }

    public function duplicate(string $id, Request $request)
    {
        return ApiResponse::success([
            'campaign' => $this->service->duplicate($id, $request->get('permissions', [])),
        ], 201);
    }

    public function activate(string $id, Request $request)
    {
        return ApiResponse::success([
            'campaign' => $this->service->activate($id, $request->get('permissions', [])),
        ]);
    }

    public function pause(string $id, Request $request)
    {
        return ApiResponse::success([
            'campaign' => $this->service->pause($id, $request->get('permissions', [])),
        ]);
    }

    public function resume(string $id, Request $request)
    {
        return ApiResponse::success([
            'campaign' => $this->service->resume($id, $request->get('permissions', [])),
        ]);
    }

    public function deactivate(string $id, Request $request)
    {
        return ApiResponse::success([
            'campaign' => $this->service->deactivate($id, $request->get('permissions', [])),
        ]);
    }

    public function archive(string $id, Request $request)
    {
        return ApiResponse::success([
            'campaign' => $this->service->archive($id, $request->get('permissions', [])),
        ]);
    }

    public function destroy(string $id, Request $request)
    {
        $this->service->delete($id, $request->get('permissions', []));
        return ApiResponse::success(null, 204);
    }

    public function sendNotification(string $id, Request $request)
    {
        return ApiResponse::success([
            'campaign' => $this->service->sendNotification($id, $request->get('permissions', [])),
        ]);
    }
}
