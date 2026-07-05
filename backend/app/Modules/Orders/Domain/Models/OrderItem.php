<?php

namespace App\Modules\Orders\Domain\Models;

use App\Shared\Database\Traits\BelongsToTenant;
use App\Shared\Database\Traits\HasTenant;
use App\Shared\Database\Traits\HasUuid;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class OrderItem extends Model
{
    use BelongsToTenant, HasTenant, HasUuid;

    protected $fillable = [
        'tenant_id',
        'order_id',
        'meal_id',
        'quantity',
        'base_price',
        'final_price',
        'discount_amount',
        'revenue_recovery_campaign_id',
    ];

    protected function casts(): array
    {
        return [
            'base_price' => 'decimal:2',
            'final_price' => 'decimal:2',
            'discount_amount' => 'decimal:2',
        ];
    }

    public function order(): BelongsTo
    {
        return $this->belongsTo(Order::class, 'order_id');
    }

    public function options(): HasMany
    {
        return $this->hasMany(OrderItemOption::class, 'order_item_id');
    }

    public function meal(): BelongsTo
    {
        return $this->belongsTo(\App\Modules\Menu\Domain\Models\Meal::class, 'meal_id');
    }
}
