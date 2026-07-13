<?php

namespace App\Modules\Engagement\Interfaces\Controllers;

use App\Modules\Engagement\Application\Services\ChatService;
use App\Shared\Utils\ApiResponse;
use Illuminate\Http\Request;
use Illuminate\Routing\Controller;

class PlatformChatController extends Controller
{
    public function __construct(private ChatService $chatService) {}

    public function index(Request $request)
    {
        return ApiResponse::success([
            'threads' => $this->chatService->listPlatformThreads($request->query('tenant_id')),
        ]);
    }

    public function store(Request $request)
    {
        $data = $request->validate([
            'tenant_id' => ['required', 'uuid'],
            'subject' => ['nullable', 'string', 'max:200'],
        ]);

        $thread = $this->chatService->openPlatformTenantThread(
            $request->user(),
            $data['tenant_id'],
            $data['subject'] ?? null,
        );

        return ApiResponse::success(['thread' => $thread], 201);
    }

    public function show(string $id)
    {
        return ApiResponse::success([
            'thread' => $this->chatService->messagesForPlatform($id),
        ]);
    }

    public function postMessage(Request $request, string $id)
    {
        $data = $request->validate([
            'body' => ['required', 'string', 'max:5000'],
        ]);

        $message = $this->chatService->postPlatformMessage($request->user(), $id, $data['body']);

        return ApiResponse::success(['message' => $message], 201);
    }
}
