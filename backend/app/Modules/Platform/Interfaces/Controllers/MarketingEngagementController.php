<?php

namespace App\Modules\Platform\Interfaces\Controllers;

use App\Modules\Platform\Application\Services\MarketingChatService;
use App\Modules\Platform\Application\Services\MarketingVisitorService;
use App\Shared\Utils\ApiResponse;
use Illuminate\Http\Request;
use Illuminate\Routing\Controller;

class MarketingEngagementController extends Controller
{
    public function __construct(
        private MarketingVisitorService $visitorService,
        private MarketingChatService $chatService,
    ) {}

    public function visitorHit(Request $request)
    {
        $ip = (string) ($request->ip() ?? '0.0.0.0');
        $result = $this->visitorService->hit($ip);

        return ApiResponse::success([
            'display_count' => $result['display_count'],
            'incremented' => $result['incremented'],
            'step' => MarketingVisitorService::INCREMENT,
        ]);
    }

    public function chat(Request $request)
    {
        $data = $request->validate([
            'message' => ['required', 'string', 'max:1000'],
            'email' => ['nullable', 'email', 'max:190'],
            'history' => ['nullable', 'array', 'max:8'],
            'history.*.role' => ['required_with:history', 'in:user,assistant'],
            'history.*.content' => ['required_with:history', 'string', 'max:1000'],
        ]);

        $result = $this->chatService->reply(
            $data['message'],
            $data['history'] ?? [],
            $data['email'] ?? null,
        );

        return ApiResponse::success($result);
    }
}
