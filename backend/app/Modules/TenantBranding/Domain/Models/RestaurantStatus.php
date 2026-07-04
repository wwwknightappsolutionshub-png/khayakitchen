<?php

namespace App\Modules\TenantBranding\Domain\Models;

use App\Shared\Database\Traits\BelongsToTenant;
use App\Shared\Database\Traits\HasTenant;
use App\Shared\Database\Traits\HasUuid;
use Illuminate\Database\Eloquent\Model;

class RestaurantStatus extends Model
{
    use BelongsToTenant, HasTenant, HasUuid;

    public const STATUS_OPEN = 'open';

    public const STATUS_CLOSING_SOON = 'closing_soon';

    public const STATUS_CLOSED = 'closed';

    public const STATUS_PROMO_MODE = 'promo_mode';

    protected $fillable = [
        'tenant_id',
        'status',
        'closing_at',
        'promo_ends_at',
        'promo_meals',
        'is_accepting_orders',
        'promo_alerts_enabled',
        'last_promo_alert_at',
        'previous_status',
        'updated_by',
    ];

    protected function casts(): array
    {
        return [
            'is_accepting_orders' => 'boolean',
            'promo_alerts_enabled' => 'boolean',
            'last_promo_alert_at' => 'datetime',
            'closing_at' => 'datetime',
            'promo_ends_at' => 'datetime',
            'promo_meals' => 'array',
        ];
    }
}
