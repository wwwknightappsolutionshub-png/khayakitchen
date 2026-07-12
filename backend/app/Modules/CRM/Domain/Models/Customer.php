<?php

namespace App\Modules\CRM\Domain\Models;

use App\Shared\Database\Traits\BelongsToTenant;
use App\Shared\Database\Traits\HasTenant;
use App\Shared\Database\Traits\HasUuid;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasOne;
use Illuminate\Database\Eloquent\SoftDeletes;
use App\Modules\NotificationsCampaign\Domain\Models\CustomerNotificationPreference;

class Customer extends Model
{
    use BelongsToTenant, HasTenant, HasUuid, SoftDeletes;

    protected $fillable = [
        'tenant_id',
        'name',
        'email',
        'phone',
        'referred_by_customer_id',
        'created_by',
        'updated_by',
    ];

    public function profile(): HasOne
    {
        return $this->hasOne(CrmProfile::class, 'customer_id');
    }

    public function referredBy(): \Illuminate\Database\Eloquent\Relations\BelongsTo
    {
        return $this->belongsTo(self::class, 'referred_by_customer_id');
    }

    public function referrals(): \Illuminate\Database\Eloquent\Relations\HasMany
    {
        return $this->hasMany(self::class, 'referred_by_customer_id');
    }

    public function notificationPreference(): HasOne
    {
        return $this->hasOne(CustomerNotificationPreference::class, 'customer_id');
    }
}
