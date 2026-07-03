<?php

namespace App\Modules\Orders\Domain\Models;

use App\Shared\Database\Traits\BelongsToTenant;
use App\Shared\Database\Traits\HasTenant;
use App\Shared\Database\Traits\HasUuid;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;

class Payment extends Model
{
    use BelongsToTenant, HasTenant, HasUuid, SoftDeletes;

    public $timestamps = false;

    protected $fillable = [
        'tenant_id',
        'order_id',
        'provider',
        'status',
        'amount',
        'created_at',
    ];

    protected function casts(): array
    {
        return [
            'amount' => 'decimal:2',
            'created_at' => 'datetime',
        ];
    }
}
