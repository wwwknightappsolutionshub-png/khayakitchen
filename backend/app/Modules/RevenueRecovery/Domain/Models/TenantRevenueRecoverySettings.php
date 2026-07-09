<?php

namespace App\Modules\RevenueRecovery\Domain\Models;

use App\Modules\Auth\Domain\Models\Tenant;
use App\Shared\Database\Traits\HasUuid;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class TenantRevenueRecoverySettings extends Model
{
    use HasUuid;

    public const DEFAULT_BAIT_TIERS = [
        ['min_km' => 0, 'max_km' => 2, 'urgency_label' => 'You are very close'],
        ['min_km' => 2, 'max_km' => 5, 'urgency_label' => 'You are nearby'],
        ['min_km' => 5, 'max_km' => 10, 'urgency_label' => 'You are in the area'],
    ];

    protected $fillable = [
        'tenant_id',
        'time_based_enabled',
        'proximity_enabled',
        'geofence_radius_km',
        'tenant_can_edit_radius',
        'kitchen_lat',
        'kitchen_lng',
        'kitchen_address_text',
        'proximity_bait_tiers',
        'max_daily_proximity_pushes_per_customer',
        'location_accuracy_max_meters',
    ];

    protected function casts(): array
    {
        return [
            'time_based_enabled' => 'boolean',
            'proximity_enabled' => 'boolean',
            'tenant_can_edit_radius' => 'boolean',
            'geofence_radius_km' => 'float',
            'kitchen_lat' => 'float',
            'kitchen_lng' => 'float',
            'proximity_bait_tiers' => 'array',
            'max_daily_proximity_pushes_per_customer' => 'integer',
            'location_accuracy_max_meters' => 'integer',
        ];
    }

    public function tenant(): BelongsTo
    {
        return $this->belongsTo(Tenant::class);
    }
}
