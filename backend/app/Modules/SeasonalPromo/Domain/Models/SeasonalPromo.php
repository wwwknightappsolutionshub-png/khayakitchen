<?php

namespace App\Modules\SeasonalPromo\Domain\Models;

use App\Shared\Database\Traits\BelongsToTenant;
use App\Shared\Database\Traits\HasUuid;
use Illuminate\Database\Eloquent\Model;

class SeasonalPromo extends Model
{
    use HasUuid, BelongsToTenant;

    protected $fillable = [
        'tenant_id',
        'image_url',
        'headline',
        'subheadline',
        'details',
        'cta_label',
        'meal_id',
        'is_published',
    ];

    protected function casts(): array
    {
        return [
            'is_published' => 'boolean',
        ];
    }
}
