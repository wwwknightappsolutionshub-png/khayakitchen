<?php

namespace App\Modules\Platform\Domain\Models;

use App\Shared\Database\Traits\HasUuid;
use Illuminate\Database\Eloquent\Model;

class MarketingVisitorStat extends Model
{
    use HasUuid;

    protected $fillable = [
        'display_count',
    ];

    protected function casts(): array
    {
        return [
            'display_count' => 'integer',
        ];
    }
}
