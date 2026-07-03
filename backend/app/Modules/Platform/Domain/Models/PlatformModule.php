<?php

namespace App\Modules\Platform\Domain\Models;

use App\Shared\Database\Traits\HasUuid;
use Illuminate\Database\Eloquent\Model;

class PlatformModule extends Model
{
    use HasUuid;

    protected $fillable = [
        'key',
        'name',
        'status',
        'enabled',
        'sort_order',
        'description',
    ];

    protected function casts(): array
    {
        return [
            'enabled' => 'boolean',
            'sort_order' => 'integer',
        ];
    }
}
