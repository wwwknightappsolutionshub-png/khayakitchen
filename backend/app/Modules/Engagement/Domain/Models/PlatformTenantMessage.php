<?php

namespace App\Modules\Engagement\Domain\Models;

use App\Shared\Database\Traits\BelongsToTenant;
use App\Shared\Database\Traits\HasTenant;
use App\Shared\Database\Traits\HasUuid;
use Illuminate\Database\Eloquent\Model;

class PlatformTenantMessage extends Model
{
    use BelongsToTenant, HasTenant, HasUuid;

    public $timestamps = false;

    protected $fillable = [
        'tenant_id',
        'sender_user_id',
        'channel',
        'title',
        'body',
        'metadata',
        'status',
        'error_message',
        'sent_at',
        'created_at',
    ];

    protected function casts(): array
    {
        return [
            'sent_at' => 'datetime',
            'created_at' => 'datetime',
            'metadata' => 'array',
        ];
    }
}
