<?php

namespace App\Modules\Loyalty\Domain\Models;

use App\Shared\Database\Traits\BelongsToTenant;
use App\Shared\Database\Traits\HasUuid;
use Illuminate\Database\Eloquent\Model;

class LoyaltySettings extends Model
{
    use BelongsToTenant, HasUuid;

    protected $fillable = [
        'tenant_id',
        'enrollments_paused',
        'referral_stamp_credit',
        'referral_points_credit',
        'near_goal_threshold_percent',
    ];

    protected function casts(): array
    {
        return [
            'enrollments_paused' => 'boolean',
            'referral_stamp_credit' => 'integer',
            'referral_points_credit' => 'integer',
            'near_goal_threshold_percent' => 'integer',
        ];
    }
}
