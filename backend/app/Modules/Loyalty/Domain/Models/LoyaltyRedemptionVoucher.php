<?php

namespace App\Modules\Loyalty\Domain\Models;

use App\Modules\CRM\Domain\Models\Customer;
use App\Shared\Database\Traits\BelongsToTenant;
use App\Shared\Database\Traits\HasTenant;
use App\Shared\Database\Traits\HasUuid;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class LoyaltyRedemptionVoucher extends Model
{
    use BelongsToTenant, HasTenant, HasUuid;

    protected $fillable = [
        'tenant_id',
        'customer_id',
        'loyalty_account_id',
        'loyalty_package_id',
        'code',
        'kind',
        'points',
        'stamps',
        'reward_type',
        'reward_value',
        'reward_label',
        'status',
        'expires_at',
        'fulfilled_at',
        'fulfilled_by',
        'cancelled_at',
    ];

    protected function casts(): array
    {
        return [
            'points' => 'integer',
            'stamps' => 'integer',
            'reward_value' => 'float',
            'expires_at' => 'datetime',
            'fulfilled_at' => 'datetime',
            'cancelled_at' => 'datetime',
        ];
    }

    public function customer(): BelongsTo
    {
        return $this->belongsTo(Customer::class, 'customer_id');
    }

    public function account(): BelongsTo
    {
        return $this->belongsTo(LoyaltyAccount::class, 'loyalty_account_id');
    }

    public function package(): BelongsTo
    {
        return $this->belongsTo(LoyaltyPackage::class, 'loyalty_package_id');
    }

    public function isPending(): bool
    {
        return $this->status === 'pending';
    }

    /**
     * @return array<string, mixed>
     */
    public function toApiArray(?Customer $customer = null): array
    {
        $customer ??= $this->relationLoaded('customer') ? $this->customer : null;

        return [
            'id' => $this->id,
            'code' => $this->code,
            'kind' => $this->kind,
            'status' => $this->status,
            'points' => $this->points,
            'stamps' => $this->stamps,
            'reward_type' => $this->reward_type,
            'reward_value' => $this->reward_value,
            'reward_label' => $this->reward_label,
            'package_id' => $this->loyalty_package_id,
            'expires_at' => $this->expires_at?->toIso8601String(),
            'fulfilled_at' => $this->fulfilled_at?->toIso8601String(),
            'cancelled_at' => $this->cancelled_at?->toIso8601String(),
            'created_at' => $this->created_at?->toIso8601String(),
            'customer' => $customer ? [
                'id' => $customer->id,
                'name' => $customer->name,
                'phone' => $customer->phone,
            ] : null,
        ];
    }
};
