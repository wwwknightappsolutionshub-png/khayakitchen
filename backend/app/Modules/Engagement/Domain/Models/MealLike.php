<?php

namespace App\Modules\Engagement\Domain\Models;

use App\Shared\Database\Traits\BelongsToTenant;
use App\Shared\Database\Traits\HasTenant;
use App\Shared\Database\Traits\HasUuid;
use Illuminate\Database\Eloquent\Model;

class MealLike extends Model
{
    use BelongsToTenant, HasTenant, HasUuid;

    public $timestamps = false;

    protected $fillable = [
        'tenant_id',
        'meal_id',
        'customer_id',
        'guest_key',
        'created_at',
    ];

    protected function casts(): array
    {
        return [
            'created_at' => 'datetime',
        ];
    }
}
