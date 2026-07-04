<?php

namespace App\Modules\Platform\Domain\Models;

use App\Shared\Database\Traits\HasUuid;
use Illuminate\Database\Eloquent\Model;

class PlatformSettings extends Model
{
    use HasUuid;

    protected $fillable = [
        'app_name',
        'logo_url',
        'primary_color',
        'secondary_color',
        'accent_color',
        'background_color',
        'splash_enabled',
        'splash_headline',
        'splash_subheadline',
        'splash_image_url',
        'ticker_enabled',
        'ticker_text',
        'public_pricing_enabled',
    ];

    protected function casts(): array
    {
        return [
            'splash_enabled' => 'boolean',
            'ticker_enabled' => 'boolean',
            'public_pricing_enabled' => 'boolean',
        ];
    }
}
