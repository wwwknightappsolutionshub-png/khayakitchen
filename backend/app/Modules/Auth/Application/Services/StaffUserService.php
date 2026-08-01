<?php

namespace App\Modules\Auth\Application\Services;

use App\Modules\Auth\Domain\Models\Tenant;
use App\Modules\Auth\Domain\Models\User;
use App\Modules\Auth\Mail\StaffInviteMail;
use App\Modules\Pricing\Application\Services\AuditLogService;
use App\Modules\Pricing\Application\Services\PlanLimitService;
use App\Shared\Auth\PermissionService;
use App\Shared\Tenancy\TenantContext;
use Illuminate\Support\Facades\Mail;
use Illuminate\Validation\ValidationException;

class StaffUserService
{
    private const ROLE_LABELS = [
        'owner' => 'Owner',
        'manager' => 'Manager',
        'kitchen' => 'Chef (kitchen)',
        'staff' => 'Waiter (floor staff)',
    ];

    public function __construct(
        private TenantContext $tenantContext,
        private PermissionService $permissionService,
        private PlanLimitService $planLimitService,
        private AuditLogService $auditLogService,
    ) {}

    public function list(array $permissions)
    {
        $this->permissionService->authorize($permissions, 'staff.manage');

        return User::where('tenant_id', $this->tenantContext->id())
            ->orderBy('name')
            ->get(['id', 'name', 'email', 'role', 'status', 'last_login_at', 'created_at']);
    }

    public function create(array $data, array $permissions): User
    {
        $this->permissionService->authorize($permissions, 'staff.manage');
        $this->planLimitService->assertStaffLimit();

        $tenantId = $this->tenantContext->id();

        if (User::withoutGlobalScopes()->where('email', $data['email'])->exists()) {
            throw ValidationException::withMessages(['email' => ['This email is already registered.']]);
        }

        $plainPassword = $data['password'];

        $user = User::create([
            'tenant_id' => $tenantId,
            'name' => $data['name'],
            'email' => $data['email'],
            'password' => $plainPassword,
            'role' => $data['role'],
            'status' => 'active',
            'email_verified_at' => now(),
        ]);

        $tenant = Tenant::withoutGlobalScopes()->find($tenantId);
        $loginUrl = rtrim((string) config('app.frontend_url', env('FRONTEND_URL', 'http://localhost:3000')), '/').'/ops/login';

        try {
            Mail::to($user->email)->send(new StaffInviteMail(
                staffName: $user->name,
                staffEmail: $user->email,
                roleLabel: self::ROLE_LABELS[$user->role] ?? $user->role,
                restaurantName: $tenant?->name ?? 'your kitchen',
                tenantSlug: $tenant?->slug ?? '',
                temporaryPassword: $plainPassword,
                loginUrl: $loginUrl,
            ));
        } catch (\Throwable $e) {
            report($e);
        }

        $this->auditLogService->log(
            'staff.created',
            $tenantId,
            $this->tenantContext->user()?->id,
            'user',
            $user->id,
            [
                'email' => $user->email,
                'role' => $user->role,
            ],
        );

        return $user;
    }

    public function update(string $id, array $data, array $permissions): User
    {
        $this->permissionService->authorize($permissions, 'staff.manage');

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
