<?php

namespace App\Modules\SeasonalPromo\Domain\Models;

use App\Shared\Database\Traits\HasUuid;
use Illuminate\Database\Eloquent\Model;

class TenantTrialReminder extends Model
{
    use HasUuid;

    protected $fillable = [
        'tenant_id',
        'days_before_end',
        'feature_keys',
        'sent_at',
    ];

    protected function casts(): array
    {
        return [
            'feature_keys' => 'array',
            'sent_at' => 'datetime',
        ];
    }
}
