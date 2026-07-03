<?php

namespace App\Modules\Menu\Domain\Models;

use App\Shared\Database\Traits\BelongsToTenant;
use App\Shared\Database\Traits\HasTenant;
use App\Shared\Database\Traits\HasUuid;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\SoftDeletes;

class Meal extends Model
{
    use BelongsToTenant, HasTenant, HasUuid, SoftDeletes;

    protected $fillable = [
        'tenant_id',
        'name',
        'description',
        'image_url',
        'base_price',
        'is_active',
        'created_by',
        'updated_by',
    ];

    protected function casts(): array
    {
        return [
            'is_active' => 'boolean',
            'base_price' => 'decimal:2',
        ];
    }

    public function optionGroups(): HasMany
    {
        return $this->hasMany(OptionGroup::class, 'meal_id');
    }
}
