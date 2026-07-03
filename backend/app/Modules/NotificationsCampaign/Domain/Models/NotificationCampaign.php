<?php

namespace App\Modules\NotificationsCampaign\Domain\Models;

use App\Shared\Database\Traits\BelongsToTenant;
use App\Shared\Database\Traits\HasTenant;
use App\Shared\Database\Traits\HasUuid;
use Illuminate\Database\Eloquent\Model;

class NotificationCampaign extends Model
{
    use BelongsToTenant, HasTenant, HasUuid;

    protected $fillable = [
        'tenant_id',
        'title',
        'message',
        'type',
        'channel',
        'status',
        'target_audience',
        'created_by',
        'sent_count',
        'delivered_count',
        'failed_count',
        'scheduled_at',
        'sent_at',
    ];

    protected function casts(): array
    {
        return [
            'scheduled_at' => 'datetime',
            'sent_at' => 'datetime',
        ];
    }
}
