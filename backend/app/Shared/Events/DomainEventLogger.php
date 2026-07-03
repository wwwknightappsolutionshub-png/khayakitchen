<?php

namespace App\Shared\Events;

use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;

class DomainEventLogger
{
    public static function log(string $tenantId, string $eventName, array $payload = [], ?string $aggregateId = null, ?string $aggregateType = null): void
    {
        DB::table('domain_event_logs')->insert([
            'id' => (string) Str::uuid(),
            'tenant_id' => $tenantId,
            'event_name' => $eventName,
            'payload' => json_encode($payload),
            'aggregate_id' => $aggregateId,
            'aggregate_type' => $aggregateType,
            'created_at' => now(),
        ]);
    }
}
