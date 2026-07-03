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
        $limit = min((int) $request->query('limit', 100), 500);
        $tenantId = $request->query('tenant_id');

        $query = DB::table('audit_logs')->orderByDesc('created_at')->limit($limit);

        if ($tenantId) {
            $query->where('tenant_id', $tenantId);
        }

        $logs = $query->get()->map(fn ($row) => [
            'id' => $row->id,
            'tenant_id' => $row->tenant_id,
            'action' => $row->action,
            'user_id' => $row->user_id,
            'entity_type' => $row->entity_type,
            'entity_id' => $row->entity_id,
            'metadata' => json_decode($row->metadata ?? '{}', true),
            'reason' => $row->reason,
            'created_at' => $row->created_at,
        ]);

        return ApiResponse::success(['logs' => $logs]);
    }
}
