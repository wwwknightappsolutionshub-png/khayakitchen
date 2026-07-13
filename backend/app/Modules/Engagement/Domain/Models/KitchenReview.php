<?php

namespace App\Modules\Engagement\Domain\Models;

use App\Shared\Database\Traits\BelongsToTenant;
use App\Shared\Database\Traits\HasTenant;
use App\Shared\Database\Traits\HasUuid;
use Illuminate\Database\Eloquent\Model;

class KitchenReview extends Model
{
    use BelongsToTenant, HasTenant, HasUuid;

    protected $fillable = [
        'tenant_id',
        'customer_id',
        'customer_name',
        'customer_phone',
        'body',
        'summary',
        'status',
        'moderated_by',
        'moderated_at',
    ];

    protected function casts(): array
    {
        return [
            'moderated_at' => 'datetime',
        ];
    }
}
