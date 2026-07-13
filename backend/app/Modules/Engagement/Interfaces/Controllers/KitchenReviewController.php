<?php

namespace App\Modules\Engagement\Interfaces\Controllers;

use App\Modules\Engagement\Application\Services\KitchenReviewService;
use App\Shared\Utils\ApiResponse;
use Illuminate\Http\Request;
use Illuminate\Routing\Controller;

class KitchenReviewController extends Controller
{
    public function __construct(private KitchenReviewService $kitchenReviewService) {}

    public function index(Request $request)
    {
        return ApiResponse::success([
            'reviews' => $this->kitchenReviewService->listForOwner(
                $request->get('permissions', []),
                $request->query('status'),
            ),
        ]);
    }

    public function moderate(Request $request, string $id)
    {
        $data = $request->validate([
            'status' => ['required', 'in:approved,rejected'],
        ]);

        $review = $this->kitchenReviewService->moderate(
            $id,
            $data['status'],
            $request->get('permissions', []),
        );

        return ApiResponse::success(['review' => $review]);
    }
}
