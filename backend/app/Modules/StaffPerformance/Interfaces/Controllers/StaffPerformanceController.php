<?php

namespace App\Modules\StaffPerformance\Interfaces\Controllers;

use App\Modules\StaffPerformance\Application\Services\StaffPerformanceService;
use App\Shared\Utils\ApiResponse;
use Illuminate\Http\Request;
use Illuminate\Routing\Controller;

class StaffPerformanceController extends Controller
{
    public function __construct(private StaffPerformanceService $staffPerformanceService) {}

    public function overview(Request $request)
    {
        $data = $request->validate([
            'from' => ['nullable', 'date'],
            'to' => ['nullable', 'date'],
            'role' => ['nullable', 'in:waiter,chef,staff,kitchen,all'],
        ]);

        return ApiResponse::success(
            $this->staffPerformanceService->overview(
                $request->get('permissions', []),
                $data['from'] ?? null,
                $data['to'] ?? null,
                ($data['role'] ?? 'all') === 'all' ? null : $data['role'],
            ),
        );
    }
}
