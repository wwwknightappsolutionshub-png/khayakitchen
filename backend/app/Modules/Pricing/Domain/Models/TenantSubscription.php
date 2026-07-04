<?php

namespace App\Modules\Pricing\Domain\Models;

use App\Modules\Auth\Domain\Models\Tenant;
use App\Shared\Database\Traits\HasUuid;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class TenantSubscription extends Model
{
    use HasUuid;

    protected $fillable = [
        'tenant_id',
        'plan_id',
        'status',
        'billing_status',
        'started_at',
        'ends_at',
    ];

    protected function casts(): array
    {
        return [
            'started_at' => 'datetime',
            'ends_at' => 'datetime',
        ];
    }

    public function plan(): BelongsTo
    {
        return $this->belongsTo(Plan::class);
    }

    public function tenant(): BelongsTo
    {
        return $this->belongsTo(Tenant::class, 'tenant_id');
    }
}
