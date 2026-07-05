<?php

namespace App\Modules\Orders\Domain\Models;

use App\Shared\Database\Traits\BelongsToTenant;
use App\Shared\Database\Traits\HasTenant;
use App\Shared\Database\Traits\HasUuid;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\SoftDeletes;

class Order extends Model
{
    use BelongsToTenant, HasTenant, HasUuid, SoftDeletes;

    protected $fillable = [
        'tenant_id',
        'customer_id',
        'status',
        'order_type',
        'scheduled_time',
        'total_amount',
        'discount_total',
        'revenue_recovery_campaign_id',
        'created_by',
        'updated_by',
    ];

    protected function casts(): array
    {
        return [
            'scheduled_time' => 'datetime',
            'total_amount' => 'decimal:2',
            'discount_total' => 'decimal:2',
        ];
    }

    public function items(): HasMany
    {
        return $this->hasMany(OrderItem::class, 'order_id');
    }
}
