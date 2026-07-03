<?php

namespace App\Modules\TenantBranding\Domain\Models;

use App\Shared\Database\Traits\BelongsToTenant;
use App\Shared\Database\Traits\HasTenant;
use App\Shared\Database\Traits\HasUuid;
use Illuminate\Database\Eloquent\Model;

class TenantBranding extends Model
{
    use BelongsToTenant, HasTenant, HasUuid;

    protected $fillable = [
        'tenant_id',
        'restaurant_name',
        'logo_url',
        'primary_color',
        'secondary_color',
        'banner_image',
    ];
}
