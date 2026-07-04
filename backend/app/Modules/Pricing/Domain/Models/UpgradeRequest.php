<?php

namespace App\Modules\Pricing\Domain\Models;

use App\Shared\Database\Traits\HasUuid;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class UpgradeRequest extends Model
{
    use HasUuid;

    protected $fillable = [
        'tenant_id',
        'current_plan_id',
        'requested_plan_id',
        'status',
        'message',
        'created_by',
    ];

    public function tenant(): BelongsTo
    {
        return $this->belongsTo(\App\Modules\Auth\Domain\Models\Tenant::class);
    }

    public function requestedPlan(): BelongsTo
    {
        return $this->belongsTo(Plan::class, 'requested_plan_id');
    }

    public function currentPlan(): BelongsTo
    {
        return $this->belongsTo(Plan::class, 'current_plan_id');
    }
}
