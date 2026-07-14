<?php

namespace App\Modules\StaffPerformance\Domain\Models;

use App\Shared\Database\Traits\BelongsToTenant;
use App\Shared\Database\Traits\HasTenant;
use App\Shared\Database\Traits\HasUuid;
use Illuminate\Database\Eloquent\Model;

class OrderStatusEvent extends Model
{
    use BelongsToTenant, HasTenant, HasUuid;

    public $timestamps = false;

    protected $fillable = [
        'tenant_id',
        'order_id',
        'user_id',
        'from_status',
        'to_status',
        'created_at',
    ];

    protected function casts(): array
    {
        return [
            'created_at' => 'datetime',
        ];
    }
}
