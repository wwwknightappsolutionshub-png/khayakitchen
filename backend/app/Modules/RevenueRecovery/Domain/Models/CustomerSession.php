<?php

namespace App\Modules\RevenueRecovery\Domain\Models;

use App\Modules\CRM\Domain\Models\Customer;
use App\Shared\Database\Traits\BelongsToTenant;
use App\Shared\Database\Traits\HasTenant;
use App\Shared\Database\Traits\HasUuid;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class CustomerSession extends Model
{
    use BelongsToTenant, HasTenant, HasUuid;

    protected $fillable = [
        'tenant_id',
        'customer_id',
        'phone',
        'email',
        'token_hash',
        'location_opt_in',
        'last_seen_at',
        'expires_at',
    ];

    protected function casts(): array
    {
        return [
            'location_opt_in' => 'boolean',
            'last_seen_at' => 'datetime',
            'expires_at' => 'datetime',
        ];
    }

    public function customer(): BelongsTo
    {
        return $this->belongsTo(Customer::class);
    }
}
