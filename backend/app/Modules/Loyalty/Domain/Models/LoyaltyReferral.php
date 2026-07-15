<?php

namespace App\Modules\Loyalty\Domain\Models;

use App\Shared\Database\Traits\BelongsToTenant;
use App\Shared\Database\Traits\HasUuid;
use Illuminate\Database\Eloquent\Model;

class LoyaltyReferral extends Model
{
    use BelongsToTenant, HasUuid;

    protected $fillable = [
        'tenant_id',
        'referrer_customer_id',
        'token',
        'referred_customer_id',
        'credited_order_id',
        'status',
        'attributed_at',
        'credited_at',
    ];

    protected function casts(): array
    {
        return [
            'attributed_at' => 'datetime',
            'credited_at' => 'datetime',
        ];
    }
}
