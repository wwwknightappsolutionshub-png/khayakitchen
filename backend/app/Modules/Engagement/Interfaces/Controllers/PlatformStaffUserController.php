<?php

namespace App\Modules\Engagement\Interfaces\Controllers;

use App\Modules\Auth\Domain\Models\User;
use App\Modules\Pricing\Application\Services\AuditLogService;
use App\Shared\Auth\PlatformRoles;
use App\Shared\Utils\ApiResponse;
use Illuminate\Http\Request;
use Illuminate\Routing\Controller;
use Illuminate\Support\Facades\Hash;
use Illuminate\Validation\ValidationException;

class PlatformStaffUserController extends Controller
{
    public function __construct(private AuditLogService $auditLogService) {}

    public function index()
    {
        $users = User::withoutGlobalScopes()
            ->whereIn('role', PlatformRoles::all())
            ->orderBy('name')
            ->get(['id', 'name', 'email', 'role', 'status', 'created_at']);

        return ApiResponse::success(['users' => $users]);
    }

    public function store(Request $request)
    {
        if ($request->user()->role !== PlatformRoles::OWNER) {
            abort(403, 'Only Platform Owner can create platform staff');
        }

        $data = $request->validate([
            'name' => ['required', 'string', 'max:120'],
            'email' => ['required', 'email', 'max:255'],
            'password' => ['required', 'string', 'min:8'],
            'role' => ['required', 'in:platform_admin,platform_support'],
        ]);

        if (User::withoutGlobalScopes()->where('email', $data['email'])->exists()) {
            throw ValidationException::withMessages(['email' => ['Email is already registered.']]);
        }

        $user = User::withoutGlobalScopes()->create([
            'tenant_id' => null,
            'name' => $data['name'],
            'email' => $data['email'],
            'password' => Hash::make($data['password']),
            'role' => $data['role'],
            'status' => 'active',
            'email_verified_at' => now(),
        ]);

        $this->auditLogService->log(
            'platform.staff.created',
            null,
            $request->user()->id,
            'user',
            $user->id,
            ['role' => $user->role, 'email' => $user->email],
        );

        return ApiResponse::success(['user' => $user], 201);
    }
}
