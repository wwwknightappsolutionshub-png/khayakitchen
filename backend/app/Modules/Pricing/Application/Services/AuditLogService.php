<?php

namespace App\Modules\Pricing\Application\Services;

use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;

class AuditLogService
{
    /**
     * @param  array<string, mixed>  $metadata
     */
    public function log(
        string $action,
        ?string $tenantId = null,
        ?string $userId = null,
        ?string $entityType = null,
        ?string $entityId = null,
        array $metadata = [],
        ?string $reason = null,
    ): void {
        DB::table('audit_logs')->insert([
            'id' => (string) Str::uuid(),
            'tenant_id' => $tenantId,
            'user_id' => $userId,
            'action' => $action,
            'entity_type' => $entityType,
            'entity_id' => $entityId,
            'metadata' => json_encode($metadata),
            'reason' => $reason,
            'created_at' => now(),
        ]);
    }
}
