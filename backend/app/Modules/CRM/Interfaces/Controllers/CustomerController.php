<?php

namespace App\Modules\CRM\Interfaces\Controllers;

use App\Modules\CRM\Application\Services\CrmService;
use App\Shared\Utils\ApiResponse;
use Illuminate\Http\Request;
use Illuminate\Routing\Controller;

class CustomerController extends Controller
{
    public function __construct(private CrmService $crmService) {}

    public function index(Request $request)
    {
        return ApiResponse::success([
            'customers' => $this->crmService->listCustomers($request->get('permissions', [])),
        ]);
    }

    public function show(Request $request, string $id)
    {
        $customer = $this->crmService->getCustomer($id, $request->get('permissions', []));

        $tags = \App\Modules\CRM\Domain\Models\CrmTagAssignment::where('customer_id', $id)
            ->with('tag')
            ->get();

        return ApiResponse::success([
            'customer' => $customer,
            'tags' => $tags,
        ]);
    }

    public function updateTags(Request $request, string $id)
    {
        $data = $request->validate([
            'tag_ids' => ['required', 'array'],
            'tag_ids.*' => ['uuid'],
        ]);

        $assignments = $this->crmService->updateTags($id, $data['tag_ids'], $request->get('permissions', []));

        return ApiResponse::success(['tags' => $assignments]);
    }

    public function insights(Request $request)
    {
        return ApiResponse::success(
            $this->crmService->getInsights($request->get('permissions', [])),
        );
    }
}
