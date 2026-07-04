<?php

namespace App\Modules\Pricing\Domain\Models;

use App\Shared\Database\Traits\HasUuid;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;
use Illuminate\Database\Eloquent\SoftDeletes;

class Feature extends Model
{
    use HasUuid, SoftDeletes;

    protected $fillable = [
        'key',
        'name',
        'description',
        'category',
        'icon',
        'module',
        'status',
        'internal_notes',
    ];

    public function plans(): BelongsToMany
    {
        return $this->belongsToMany(Plan::class, 'plan_features')
            ->withPivot('enabled')
            ->withTimestamps();
    }
}
