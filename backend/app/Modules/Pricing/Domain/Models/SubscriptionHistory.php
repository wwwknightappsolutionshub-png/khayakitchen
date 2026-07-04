<?php

namespace App\Modules\Pricing\Domain\Models;

use App\Shared\Database\Traits\HasUuid;
use Illuminate\Database\Eloquent\Model;

class SubscriptionHistory extends Model
{
    use HasUuid;

    public $timestamps = false;

    protected $table = 'subscription_history';

    protected $fillable = [
        'tenant_id',
        'plan_id',
        'previous_plan_id',
        'action',
        'metadata',
        'created_by',
        'created_at',
    ];

    protected function casts(): array
    {
        return [
            'metadata' => 'array',
            'created_at' => 'datetime',
        ];
    }
}
