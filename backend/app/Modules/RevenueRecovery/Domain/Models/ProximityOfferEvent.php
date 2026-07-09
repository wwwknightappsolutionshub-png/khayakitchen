<?php

namespace App\Modules\RevenueRecovery\Domain\Models;

use App\Modules\CRM\Domain\Models\Customer;
use App\Shared\Database\Traits\BelongsToTenant;
use App\Shared\Database\Traits\HasTenant;
use App\Shared\Database\Traits\HasUuid;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class ProximityOfferEvent extends Model
{
    use BelongsToTenant, HasTenant, HasUuid;

    public $timestamps = false;

    public const CHANNEL_IN_APP = 'in_app';

    public const CHANNEL_PUSH = 'push';

    public const TYPE_IMPRESSION = 'impression';

    public const TYPE_PUSH_SENT = 'push_sent';

    public const TYPE_DISMISSED = 'dismissed';

    protected $fillable = [
        'tenant_id',
        'customer_id',
        'campaign_id',
        'channel',
        'event_type',
        'distance_km',
        'message',
        'created_at',
    ];

    protected function casts(): array
    {
        return [
            'distance_km' => 'float',
            'created_at' => 'datetime',
        ];
    }

    public function customer(): BelongsTo
    {
        return $this->belongsTo(Customer::class);
    }

    public function campaign(): BelongsTo
    {
        return $this->belongsTo(RevenueRecoveryCampaign::class, 'campaign_id');
    }
}
