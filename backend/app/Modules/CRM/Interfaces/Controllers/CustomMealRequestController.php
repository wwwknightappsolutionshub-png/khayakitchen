<?php

namespace App\Modules\CRM\Interfaces\Controllers;

use App\Modules\CRM\Application\Services\CustomerAccountService;
use App\Shared\Utils\ApiResponse;
use Illuminate\Http\Request;
use Illuminate\Routing\Controller;

class CustomMealRequestController extends Controller
{
    public function __construct(private CustomerAccountService $accountService) {}

    public function index(Request $request)
    {
        return ApiResponse::success([
            'requests' => $this->accountService->listCustomMealRequestsForStaff(
                $request->get('permissions', []),
            ),
        ]);
    }

    public function updateStatus(Request $request, string $id)
    {
        $data = $request->validate([
            'status' => ['required', 'in:submitted,acknowledged,closed'],
            'staff_note' => ['nullable', 'string', 'max:2000'],
        ]);

        return ApiResponse::success([
            'request' => $this->accountService->updateCustomMealRequestStatus(
                $id,
                $data['status'],
                $request->get('permissions', []),
                $data['staff_note'] ?? null,
            ),
        ]);
    }
}
