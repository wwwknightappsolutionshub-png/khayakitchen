<?php

namespace App\Modules\Inventory\Domain\Models;

use App\Shared\Database\Traits\BelongsToTenant;
use App\Shared\Database\Traits\HasTenant;
use App\Shared\Database\Traits\HasUuid;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;

class RecipeDefinition extends Model
{
    use BelongsToTenant, HasTenant, HasUuid;

    public $timestamps = false;

    protected $fillable = [
        'tenant_id',
        'meal_id',
        'portion_size',
        'created_at',
    ];

    protected function casts(): array
    {
        return ['created_at' => 'datetime'];
    }

    public function components(): HasMany
    {
        return $this->hasMany(RecipeComponent::class, 'recipe_id');
    }
}
