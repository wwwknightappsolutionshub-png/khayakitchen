<?php

namespace App\Modules\Pricing\Interfaces\Controllers;

use App\Modules\Pricing\Application\Services\AuditLogService;
use App\Shared\Tenancy\TenantContext;
use App\Shared\Utils\ApiResponse;
use Illuminate\Http\Request;
use Illuminate\Routing\Controller;
use Illuminate\Support\Facades\DB;

class AuditLogController extends Controller
{
    public function __construct(
        private AuditLogService $auditLogService,
        private TenantContext $tenantContext,
    ) {}

    public function index(Request $request)
    {
        $tenantId = $this->tenantContext->id();
        $limit = min((int) $request->query('limit', 50), 200);

        $logs = DB::table('audit_logs')
            ->where('tenant_id', $tenantId)
            ->orderByDesc('created_at')
            ->limit($limit)
            ->get()
            ->map(fn ($row) => [
                'id' => $row->id,
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
