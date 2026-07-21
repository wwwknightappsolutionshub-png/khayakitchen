<?php

namespace App\Modules\RevenueRecovery\Domain\Models;

use App\Shared\Database\Traits\BelongsToTenant;
use App\Shared\Database\Traits\HasTenant;
use App\Shared\Database\Traits\HasUuid;
use Illuminate\Database\Eloquent\Model;

class CustomerEmailOtp extends Model
{
    use BelongsToTenant, HasTenant, HasUuid;

    public $timestamps = false;

    protected $fillable = [
        'tenant_id',
        'phone',
        'email',
        'channel',
        'purpose',
        'otp_hash',
        'expires_at',
        'attempts',
        'created_at',
    ];

    protected function casts(): array
    {
        return [
            'expires_at' => 'datetime',
            'attempts' => 'integer',
            'created_at' => 'datetime',
        ];
    }
}
