<?php

namespace App\Modules\Platform\Interfaces\Controllers;

use App\Shared\Utils\ApiResponse;
use Illuminate\Http\Request;
use Illuminate\Routing\Controller;
use Illuminate\Support\Facades\DB;

class PlatformAuditLogController extends Controller
{
    public function index(Request $request)
    {
        $data = $request->validate([
            'page' => ['nullable', 'integer', 'min:1'],
            'per_page' => ['nullable', 'integer', 'min:1', 'max:100'],
            'limit' => ['nullable', 'integer', 'min:1', 'max:500'],
            'tenant_id' => ['nullable', 'uuid'],
        ]);

        $page = (int) ($data['page'] ?? 1);
        // Prefer per_page; keep legacy limit as alias for first-page page size.
        $perPage = (int) ($data['per_page'] ?? $data['limit'] ?? 25);
        $perPage = min(max($perPage, 1), 100);
        $tenantId = $data['tenant_id'] ?? null;

        $query = DB::table('audit_logs')->orderByDesc('created_at');

        if ($tenantId) {
            $query->where('tenant_id', $tenantId);
        }

        $paginator = $query->paginate($perPage, ['*'], 'page', $page);

        $logs = collect($paginator->items())->map(fn ($row) => [
            'id' => $row->id,
            'tenant_id' => $row->tenant_id,
            'action' => $row->action,
            'user_id' => $row->user_id,
            'entity_type' => $row->entity_type,
            'entity_id' => $row->entity_id,
            'metadata' => json_decode($row->metadata ?? '{}', true),
            'reason' => $row->reason,
            'created_at' => $row->created_at,
        ])->values();

        return ApiResponse::success([
            'logs' => $logs,
            'meta' => [
                'current_page' => $paginator->currentPage(),
                'last_page' => $paginator->lastPage(),
                'per_page' => $paginator->perPage(),
                'total' => $paginator->total(),
            ],
        ]);
    }
}
