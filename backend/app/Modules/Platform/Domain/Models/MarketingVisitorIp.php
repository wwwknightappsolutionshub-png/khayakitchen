<?php

namespace App\Modules\Platform\Domain\Models;

use App\Shared\Database\Traits\HasUuid;
use Illuminate\Database\Eloquent\Model;

class MarketingVisitorIp extends Model
{
    use HasUuid;

    protected $fillable = [
        'ip_hash',
        'first_seen_at',
        'last_seen_at',
        'visit_count',
    ];

    protected function casts(): array
    {
        return [
            'first_seen_at' => 'datetime',
            'last_seen_at' => 'datetime',
            'visit_count' => 'integer',
        ];
    }
}
