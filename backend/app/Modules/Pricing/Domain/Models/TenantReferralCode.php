<?php

namespace App\Modules\Pricing\Domain\Models;

use App\Modules\Auth\Domain\Models\Tenant;
use App\Shared\Database\Traits\HasUuid;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class TenantReferralCode extends Model
{
    use HasUuid;

    protected $fillable = [
        'tenant_id',
        'code',
        'owner_type',
        'reward_days',
        'referee_trial_days',
        'active',
    ];

    protected function casts(): array
    {
        return [
            'active' => 'boolean',
            'reward_days' => 'integer',
            'referee_trial_days' => 'integer',
        ];
    }

    public function tenant(): BelongsTo
    {
        return $this->belongsTo(Tenant::class, 'tenant_id');
    }

    public function leads(): HasMany
    {
        return $this->hasMany(TenantReferralLead::class, 'referral_code_id');
    }
}
