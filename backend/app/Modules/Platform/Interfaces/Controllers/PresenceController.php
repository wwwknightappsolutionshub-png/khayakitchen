<?php

namespace App\Modules\Platform\Interfaces\Controllers;

use App\Modules\Platform\Application\Services\TenantPresenceService;
use App\Shared\Utils\ApiResponse;
use Illuminate\Http\Request;
use Illuminate\Routing\Controller;

class PresenceController extends Controller
{
    public function __construct(private TenantPresenceService $presenceService) {}

    public function heartbeat(Request $request)
    {
        $user = $request->user();
        if (! $user) {
            abort(401);
        }

        return ApiResponse::success($this->presenceService->heartbeat($user));
    }

    public function claimStaffPwa(Request $request)
    {
        $user = $request->user();
        if (! $user) {
            abort(401);
        }

        return ApiResponse::success($this->presenceService->claimStaffPwa($user));
    }
}
