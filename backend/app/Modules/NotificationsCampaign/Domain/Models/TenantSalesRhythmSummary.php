<?php

namespace App\Modules\NotificationsCampaign\Domain\Models;

use App\Shared\Database\Traits\BelongsToTenant;
use App\Shared\Database\Traits\HasTenant;
use App\Shared\Database\Traits\HasUuid;
use Illuminate\Database\Eloquent\Model;

class TenantSalesRhythmSummary extends Model
{
    use BelongsToTenant, HasTenant, HasUuid;

    protected $fillable = [
        'tenant_id',
        'lookback_days',
        'order_count',
        'timezone',
        'matrix',
        'computed_at',
    ];

    protected function casts(): array
    {
        return [
            'matrix' => 'array',
            'computed_at' => 'datetime',
            'lookback_days' => 'integer',
            'order_count' => 'integer',
        ];
    }
}
