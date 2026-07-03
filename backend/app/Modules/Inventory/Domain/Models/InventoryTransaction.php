<?php

namespace App\Modules\Inventory\Domain\Models;

use App\Shared\Database\Traits\BelongsToTenant;
use App\Shared\Database\Traits\HasTenant;
use App\Shared\Database\Traits\HasUuid;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;

class InventoryTransaction extends Model
{
    use BelongsToTenant, HasTenant, HasUuid, SoftDeletes;

    public $timestamps = false;

    protected $fillable = [
        'tenant_id',
        'inventory_item_id',
        'type',
        'quantity',
        'reference_type',
        'reference_id',
        'created_by',
        'created_at',
    ];

    protected function casts(): array
    {
        return [
            'quantity' => 'decimal:4',
            'created_at' => 'datetime',
        ];
    }
}
