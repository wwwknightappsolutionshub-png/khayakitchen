<?php

namespace App\Modules\Pricing\Domain\Models;

use App\Shared\Database\Traits\HasUuid;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class TenantEntitlementOverride extends Model
{
    use HasUuid;

    protected $fillable = [
        'tenant_id',
        'override_type',
        'override_key',
        'value_bool',
        'value_int',
        'is_unlimited',
        'is_permanent',
        'expires_at',
        'reason',
        'created_by',
    ];

    protected function casts(): array
    {
        return [
            'value_bool' => 'boolean',
            'is_unlimited' => 'boolean',
            'is_permanent' => 'boolean',
            'expires_at' => 'datetime',
        ];
    }

    public function tenant(): BelongsTo
    {
        return $this->belongsTo(\App\Modules\Auth\Domain\Models\Tenant::class);
    }

    public function scopeActive($query)
    {
        return $query->where(function ($q) {
            $q->where('is_permanent', true)
                ->orWhereNull('expires_at')
                ->orWhere('expires_at', '>', now());
        });
    }
}
