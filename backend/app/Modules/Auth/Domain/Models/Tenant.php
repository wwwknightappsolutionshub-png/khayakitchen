<?php

namespace App\Modules\Auth\Domain\Models;

use App\Shared\Database\Traits\HasUuid;
use Illuminate\Database\Eloquent\Model;

class Tenant extends Model
{
    use HasUuid;

    protected $fillable = [
        'tenant_id',
        'name',
        'slug',
        'logo_url',
        'primary_color',
        'status',
    ];

    protected static function booted(): void
    {
        static::creating(function (Tenant $tenant) {
            if (empty($tenant->tenant_id)) {
                $tenant->tenant_id = $tenant->id;
            }
        });

        static::created(function (Tenant $tenant) {
            if ($tenant->tenant_id !== $tenant->id) {
                $tenant->updateQuietly(['tenant_id' => $tenant->id]);
            }
        });
    }
}
