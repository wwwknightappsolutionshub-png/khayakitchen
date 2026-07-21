<?php

namespace App\Modules\Loyalty\Domain\Models;

use App\Shared\Database\Traits\BelongsToTenant;
use App\Shared\Database\Traits\HasTenant;
use App\Shared\Database\Traits\HasUuid;
use Illuminate\Database\Eloquent\Model;

class LoyaltyAccount extends Model
{
    use BelongsToTenant, HasTenant, HasUuid;

    public $timestamps = false;

    protected $fillable = [
        'tenant_id',
        'customer_id',
        'points_balance',
        'stamps_balance',
        'tier',
        'membership_status',
        'enrolled_at',
        'opted_in_at',
        'welcome_notified_at',
        'enrollment_source',
        'install_claimed_at',
        'install_welcome_sent_at',
        'created_at',
    ];

    protected function casts(): array
    {
        return [
            'created_at' => 'datetime',
            'enrolled_at' => 'datetime',
            'opted_in_at' => 'datetime',
            'welcome_notified_at' => 'datetime',
            'install_claimed_at' => 'datetime',
            'install_welcome_sent_at' => 'datetime',
            'points_balance' => 'integer',
            'stamps_balance' => 'integer',
        ];
    }
}
