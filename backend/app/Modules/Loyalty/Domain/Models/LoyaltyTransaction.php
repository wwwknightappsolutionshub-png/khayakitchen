<?php

namespace App\Modules\Loyalty\Domain\Models;

use App\Shared\Database\Traits\BelongsToTenant;
use App\Shared\Database\Traits\HasTenant;
use App\Shared\Database\Traits\HasUuid;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;

class LoyaltyTransaction extends Model
{
    use BelongsToTenant, HasTenant, HasUuid, SoftDeletes;

    public $timestamps = false;

    protected $fillable = [
        'tenant_id',
        'customer_id',
        'type',
        'points',
        'reference_id',
        'created_at',
    ];

    protected function casts(): array
    {
        return ['created_at' => 'datetime'];
    }
}
