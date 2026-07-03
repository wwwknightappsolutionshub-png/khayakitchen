<?php

namespace App\Modules\Notifications\Interfaces\Controllers;

use App\Modules\Notifications\Application\Services\NotificationService;
use App\Shared\Utils\ApiResponse;
use Illuminate\Http\Request;
use Illuminate\Routing\Controller;

class NotificationController extends Controller
{
    public function __construct(private NotificationService $notificationService) {}

    public function index(Request $request)
    {
        return ApiResponse::success([
            'notifications' => $this->notificationService->listForUser($request->get('permissions', [])),
        ]);
    }

    public function markRead(Request $request, string $id)
    {
        $notification = $this->notificationService->markRead($id, $request->get('permissions', []));

        return ApiResponse::success(['notification' => $notification]);
    }
}
