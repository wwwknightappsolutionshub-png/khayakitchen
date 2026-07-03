<?php

namespace App\Modules\Menu\Domain\Models;

use App\Shared\Database\Traits\BelongsToTenant;
use App\Shared\Database\Traits\HasTenant;
use App\Shared\Database\Traits\HasUuid;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class OptionGroup extends Model
{
    use BelongsToTenant, HasTenant, HasUuid;

    public $timestamps = true;

    protected $fillable = [
        'tenant_id',
        'meal_id',
        'name',
        'type',
    ];

    public function meal(): BelongsTo
    {
        return $this->belongsTo(Meal::class, 'meal_id');
    }

    public function options(): HasMany
    {
        return $this->hasMany(MealOption::class, 'option_group_id');
    }
}
