<?php

namespace App\Modules\Delivery\Domain\Models;

use App\Shared\Database\Traits\BelongsToTenant;
use App\Shared\Database\Traits\HasTenant;
use App\Shared\Database\Traits\HasUuid;
use Illuminate\Database\Eloquent\Model;

class DeliveryZone extends Model
{
    use BelongsToTenant, HasTenant, HasUuid;

    public $timestamps = false;

    protected $fillable = [
        'tenant_id',
        'name',
        'fee',
        'postcodes',
    ];

    protected function casts(): array
    {
        return [
            'fee' => 'decimal:2',
            'postcodes' => 'array',
        ];
    }
}
