<?php

namespace App\Modules\Auth\Application\Services;

use App\Modules\Auth\Domain\Models\User;
use App\Shared\Auth\PermissionService;
use App\Shared\Tenancy\TenantContext;
use Illuminate\Validation\ValidationException;

class StaffUserService
{
    public function __construct(
        private TenantContext $tenantContext,
        private PermissionService $permissionService,
    ) {}

    public function list(array $permissions)
    {
        $this->permissionService->authorize($permissions, 'settings.manage');

        return User::where('tenant_id', $this->tenantContext->id())
            ->orderBy('name')
            ->get(['id', 'name', 'email', 'role', 'status', 'last_login_at', 'created_at']);
    }

    public function create(array $data, array $permissions): User
    {
        $this->permissionService->authorize($permissions, 'settings.manage');

        $tenantId = $this->tenantContext->id();

        if (User::where('tenant_id', $tenantId)->where('email', $data['email'])->exists()) {
            throw ValidationException::withMessages(['email' => ['Email already in use.']]);
        }

        return User::create([
            'tenant_id' => $tenantId,
            'name' => $data['name'],
            'email' => $data['email'],
            'password' => $data['password'],
            'role' => $data['role'],
            'status' => 'active',
        ]);
    }

    public function update(string $id, array $data, array $permissions): User
    {
        $this->permissionService->authorize($permissions, 'settings.manage');

        $user = User::where('tenant_id', $this->tenantContext->id())->findOrFail($id);
        $user->update(array_filter([
            'name' => $data['name'] ?? null,
            'role' => $data['role'] ?? null,
            'status' => $data['status'] ?? null,
            'password' => $data['password'] ?? null,
        ], fn ($v) => $v !== null));

        return $user->fresh();
    }
}
