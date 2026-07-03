<?php

namespace App\Modules\Menu\Domain\Models;

use App\Shared\Database\Traits\BelongsToTenant;
use App\Shared\Database\Traits\HasTenant;
use App\Shared\Database\Traits\HasUuid;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class MealOption extends Model
{
    use BelongsToTenant, HasTenant, HasUuid;

    protected $fillable = [
        'tenant_id',
        'option_group_id',
        'name',
        'price_delta',
        'inventory_impact',
        'is_active',
    ];

    protected function casts(): array
    {
        return [
            'price_delta' => 'decimal:2',
            'inventory_impact' => 'array',
            'is_active' => 'boolean',
        ];
    }

    public function optionGroup(): BelongsTo
    {
        return $this->belongsTo(OptionGroup::class, 'option_group_id');
    }
}
