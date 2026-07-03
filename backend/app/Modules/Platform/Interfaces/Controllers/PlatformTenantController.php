<?php

namespace App\Modules\Platform\Interfaces\Controllers;

use App\Modules\Platform\Application\Services\PlatformTenantService;
use App\Shared\Utils\ApiResponse;
use Illuminate\Routing\Controller;

class PlatformTenantController extends Controller
{
    public function __construct(private PlatformTenantService $tenantService) {}

    public function index()
    {
        return ApiResponse::success(['tenants' => $this->tenantService->listTenants()]);
    }

    public function store(\Illuminate\Http\Request $request)
    {
        $data = $request->validate([
            'name' => ['required', 'string', 'max:255'],
            'slug' => ['required', 'string', 'max:100', 'alpha_dash'],
            'logo_url' => ['nullable', 'string'],
            'primary_color' => ['nullable', 'string', 'max:20'],
            'owner_name' => ['nullable', 'string', 'max:255'],
            'owner_email' => ['nullable', 'email'],
            'owner_password' => ['nullable', 'string', 'min:8'],
        ]);

        return ApiResponse::success(
            ['tenant' => $this->tenantService->createTenant($data)],
            201,
        );
    }

    public function update(\Illuminate\Http\Request $request, string $tenantId)
    {
        $data = $request->validate([
            'name' => ['sometimes', 'string', 'max:255'],
            'slug' => ['sometimes', 'string', 'max:100'],
            'logo_url' => ['nullable', 'string'],
            'primary_color' => ['nullable', 'string'],
            'status' => ['sometimes', 'in:active,suspended'],
        ]);

        return ApiResponse::success(['tenant' => $this->tenantService->updateTenant($tenantId, $data)]);
    }

    public function destroy(string $tenantId)
    {
        $this->tenantService->deleteTenant($tenantId);

        return ApiResponse::success(['deleted' => true]);
    }
}
