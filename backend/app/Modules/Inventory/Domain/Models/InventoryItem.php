<?php

namespace App\Modules\Inventory\Domain\Models;

use App\Shared\Database\Traits\BelongsToTenant;
use App\Shared\Database\Traits\HasTenant;
use App\Shared\Database\Traits\HasUuid;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;

class InventoryItem extends Model
{
    use BelongsToTenant, HasTenant, HasUuid, SoftDeletes;

    protected $fillable = [
        'tenant_id',
        'name',
        'unit',
        'current_stock',
        'reorder_level',
        'cost_per_unit',
        'created_by',
        'updated_by',
    ];

    protected function casts(): array
    {
        return [
            'current_stock' => 'decimal:4',
            'reorder_level' => 'decimal:4',
            'cost_per_unit' => 'decimal:2',
        ];
    }
}
