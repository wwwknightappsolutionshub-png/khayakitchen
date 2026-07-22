<?php

namespace App\Modules\Pricing\Domain\Models;

use App\Modules\Auth\Domain\Models\Tenant;
use App\Shared\Database\Traits\HasUuid;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class TenantReferralLead extends Model
{
    use HasUuid;

    public const STATUS_INVITED = 'invited';

    public const STATUS_CLICKED = 'clicked';

    public const STATUS_SIGNED_UP = 'signed_up';

    public const STATUS_REWARDED = 'rewarded';

    public const STATUS_REJECTED = 'rejected';

    public const STATUS_EXPIRED = 'expired';

    protected $fillable = [
        'referral_code_id',
        'referrer_tenant_id',
        'prospect_email',
        'prospect_phone',
        'prospect_name',
        'channel',
        'status',
        'invited_at',
        'clicked_at',
        'signed_up_at',
        'rewarded_at',
        'referred_tenant_id',
    ];

    protected function casts(): array
    {
        return [
            'invited_at' => 'datetime',
            'clicked_at' => 'datetime',
            'signed_up_at' => 'datetime',
            'rewarded_at' => 'datetime',
        ];
    }

    public function referralCode(): BelongsTo
    {
        return $this->belongsTo(TenantReferralCode::class, 'referral_code_id');
    }

    public function referrerTenant(): BelongsTo
    {
        return $this->belongsTo(Tenant::class, 'referrer_tenant_id');
    }

    public function referredTenant(): BelongsTo
    {
        return $this->belongsTo(Tenant::class, 'referred_tenant_id');
    }
}
