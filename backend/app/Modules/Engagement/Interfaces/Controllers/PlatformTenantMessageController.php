<?php

namespace App\Modules\Engagement\Interfaces\Controllers;

use App\Modules\Engagement\Application\Services\PlatformTenantMessagingService;
use App\Shared\Utils\ApiResponse;
use Illuminate\Http\Request;
use Illuminate\Routing\Controller;

class PlatformTenantMessageController extends Controller
{
    public function __construct(private PlatformTenantMessagingService $messagingService) {}

    public function index(Request $request)
    {
        return ApiResponse::success([
            'messages' => $this->messagingService->listForPlatform($request->query('tenant_id')),
        ]);
    }

    public function store(Request $request)
    {
        $data = $request->validate([
            'tenant_id' => ['required', 'uuid'],
            'channel' => ['required', 'in:push,email'],
            'title' => ['required', 'string', 'max:120'],
            'body' => ['required', 'string', 'max:5000'],
        ]);

        $message = $this->messagingService->send(
            $request->user(),
            $data['tenant_id'],
            $data['channel'],
            $data['title'],
            $data['body'],
        );

        return ApiResponse::success(['message' => $message], 201);
    }
}
