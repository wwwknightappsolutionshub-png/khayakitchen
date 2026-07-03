<?php

namespace App\Modules\Auth\Interfaces\Controllers;

use App\Modules\Auth\Application\Services\StaffUserService;
use App\Shared\Utils\ApiResponse;
use Illuminate\Http\Request;
use Illuminate\Routing\Controller;

class StaffUserController extends Controller
{
    public function __construct(private StaffUserService $staffUserService) {}

    public function index(Request $request)
    {
        return ApiResponse::success([
            'users' => $this->staffUserService->list($request->get('permissions', [])),
        ]);
    }

    public function store(Request $request)
    {
        $data = $request->validate([
            'name' => ['required', 'string', 'max:255'],
            'email' => ['required', 'email'],
            'password' => ['required', 'string', 'min:8'],
            'role' => ['required', 'in:owner,manager,kitchen,staff'],
        ]);

        $user = $this->staffUserService->create($data, $request->get('permissions', []));

        return ApiResponse::success(['user' => $user], 201);
    }

    public function update(Request $request, string $id)
    {
        $data = $request->validate([
            'name' => ['sometimes', 'string', 'max:255'],
            'role' => ['sometimes', 'in:owner,manager,kitchen,staff'],
            'status' => ['sometimes', 'in:active,disabled'],
            'password' => ['nullable', 'string', 'min:8'],
        ]);

        $user = $this->staffUserService->update($id, $data, $request->get('permissions', []));

        return ApiResponse::success(['user' => $user]);
    }
}
