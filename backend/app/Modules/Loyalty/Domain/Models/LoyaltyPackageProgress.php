<?php

namespace App\Modules\Loyalty\Domain\Models;

use App\Shared\Database\Traits\BelongsToTenant;
use App\Shared\Database\Traits\HasUuid;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class LoyaltyPackageProgress extends Model
{
    use BelongsToTenant, HasUuid;

    protected $table = 'loyalty_package_progress';

    protected $fillable = [
        'tenant_id',
        'loyalty_account_id',
        'loyalty_package_id',
        'current_progress',
        'times_completed',
        'last_near_goal_notified_at',
    ];

    protected function casts(): array
    {
        return [
            'current_progress' => 'integer',
            'times_completed' => 'integer',
            'last_near_goal_notified_at' => 'datetime',
        ];
    }

    public function package(): BelongsTo
    {
        return $this->belongsTo(LoyaltyPackage::class, 'loyalty_package_id');
    }

    public function account(): BelongsTo
    {
        return $this->belongsTo(LoyaltyAccount::class, 'loyalty_account_id');
    }
}
