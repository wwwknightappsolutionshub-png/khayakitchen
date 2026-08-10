<?php

namespace App\Modules\CRM\Domain\Models;

use App\Shared\Database\Traits\BelongsToTenant;
use App\Shared\Database\Traits\HasTenant;
use App\Shared\Database\Traits\HasUuid;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class CustomerWebAuthnCredential extends Model
{
    use BelongsToTenant, HasTenant, HasUuid;

    protected $table = 'customer_webauthn_credentials';

    protected $fillable = [
        'tenant_id',
        'customer_id',
        'credential_id',
        'public_key',
        'counter',
        'transports',
        'device_label',
    ];

    protected function casts(): array
    {
        return [
            'counter' => 'integer',
            'transports' => 'array',
        ];
    }

    public function customer(): BelongsTo
    {
        return $this->belongsTo(Customer::class, 'customer_id');
    }
}
