<?php

namespace App\Modules\Auth\Interfaces\Controllers;

use App\Modules\Auth\Application\Services\TenantWorkspaceService;
use App\Shared\Utils\ApiResponse;
use Illuminate\Http\Request;
use Illuminate\Routing\Controller;

class TenantWorkspaceController extends Controller
{
    public function __construct(private TenantWorkspaceService $workspaceService) {}

    public function show()
    {
        return ApiResponse::success([
            'workspace' => $this->workspaceService->getSettings(),
        ]);
    }

    public function update(Request $request)
    {
        $data = $request->validate([
            'currency' => ['sometimes', 'string', 'max:8'],
            'country' => ['nullable', 'string', 'max:120'],
            'country_iso' => ['nullable', 'string', 'size:2'],
            'timezone' => ['nullable', 'string', 'max:64'],
            'ui_theme' => ['sometimes', 'in:light,dark'],
        ]);

        return ApiResponse::success([
            'workspace' => $this->workspaceService->updateSettings(
                $data,
                $request->get('permissions', []),
            ),
        ]);
    }
}
