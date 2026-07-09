<?php

namespace App\Modules\RevenueRecovery\Domain\Models;

use App\Shared\Database\Traits\BelongsToTenant;
use App\Shared\Database\Traits\HasTenant;
use App\Shared\Database\Traits\HasUuid;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;

class RevenueRecoveryCampaign extends Model
{
    use BelongsToTenant, HasTenant, HasUuid, SoftDeletes;

    public const TYPE_CLOSING_SOON = 'closing_soon';

    public const TYPE_HAPPY_HOUR = 'happy_hour';

    public const TYPE_SLOW_PERIOD = 'slow_period';

    public const TYPE_CUSTOM = 'custom';

    public const TYPE_PROXIMITY = 'proximity';

    public const DISCOUNT_PERCENT = 'percent';

    public const DISCOUNT_FIXED = 'fixed';

    public const STATUS_DRAFT = 'draft';

    public const STATUS_SCHEDULED = 'scheduled';

    public const STATUS_ACTIVE = 'active';

    public const STATUS_PAUSED = 'paused';

    public const STATUS_DEACTIVATED = 'deactivated';

    public const STATUS_ARCHIVED = 'archived';

    protected $fillable = [
        'tenant_id',
        'name',
        'campaign_type',
        'discount_type',
        'discount_value',
        'meal_ids',
        'category_ids',
        'starts_at',
        'ends_at',
        'status',
        'notifications_enabled',
        'notification_title',
        'notification_message',
        'target_audience',
        'proximity_bait_tiers',
        'redemption_limit',
        'redemption_count',
        'orders_count',
        'discounted_items_sold',
        'recovered_revenue',
        'notifications_sent',
        'notifications_delivered',
        'notifications_opened',
        'proximity_impressions',
        'proximity_push_sent',
        'created_by',
        'duplicated_from_id',
        'activated_at',
        'archived_at',
    ];

    protected function casts(): array
    {
        return [
            'meal_ids' => 'array',
            'category_ids' => 'array',
            'proximity_bait_tiers' => 'array',
            'starts_at' => 'datetime',
            'ends_at' => 'datetime',
            'activated_at' => 'datetime',
            'archived_at' => 'datetime',
            'notifications_enabled' => 'boolean',
            'discount_value' => 'decimal:2',
            'recovered_revenue' => 'decimal:2',
            'proximity_impressions' => 'integer',
            'proximity_push_sent' => 'integer',
        ];
    }

    public function isWithinWindow(): bool
    {
        $now = now();

        return $this->starts_at <= $now && $this->ends_at >= $now;
    }

    public function hasRedemptionsRemaining(): bool
    {
        if ($this->redemption_limit === null) {
            return true;
        }

        return $this->redemption_count < $this->redemption_limit;
    }
}
