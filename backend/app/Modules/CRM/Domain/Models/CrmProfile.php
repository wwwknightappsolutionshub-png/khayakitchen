<?php

namespace App\Modules\CRM\Domain\Models;

use App\Shared\Database\Traits\BelongsToTenant;
use App\Shared\Database\Traits\HasTenant;
use App\Shared\Database\Traits\HasUuid;
use Illuminate\Database\Eloquent\Model;

class CrmProfile extends Model
{
    use BelongsToTenant, HasTenant, HasUuid;

    public $timestamps = false;

    protected $fillable = [
        'tenant_id',
        'customer_id',
        'total_spent',
        'order_count',
        'last_order_at',
        'favorite_meal_id',
        'average_order_value',
        'visit_frequency_score',
        'is_loyal',
        'created_at',
    ];

    protected function casts(): array
    {
        return [
            'total_spent' => 'decimal:2',
            'average_order_value' => 'decimal:2',
            'last_order_at' => 'datetime',
            'created_at' => 'datetime',
            'is_loyal' => 'boolean',
        ];
    }
}
