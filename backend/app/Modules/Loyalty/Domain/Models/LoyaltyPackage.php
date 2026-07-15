<?php

namespace App\Modules\Loyalty\Domain\Models;

use App\Shared\Database\Traits\BelongsToTenant;
use App\Shared\Database\Traits\HasUuid;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;

class LoyaltyPackage extends Model
{
    use BelongsToTenant, HasUuid;

    protected $fillable = [
        'tenant_id',
        'name',
        'description',
        'package_type',
        'goal_value',
        'reward_type',
        'reward_value',
        'reward_label',
        'is_active',
        'sort_order',
    ];

    protected function casts(): array
    {
        return [
            'goal_value' => 'integer',
            'reward_value' => 'float',
            'is_active' => 'boolean',
            'sort_order' => 'integer',
        ];
    }

    public function progressRows(): HasMany
    {
        return $this->hasMany(LoyaltyPackageProgress::class, 'loyalty_package_id');
    }
}
