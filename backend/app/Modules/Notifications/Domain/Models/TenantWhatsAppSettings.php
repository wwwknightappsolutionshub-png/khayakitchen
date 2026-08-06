<?php

namespace App\Modules\Notifications\Domain\Models;

use App\Modules\Auth\Domain\Models\Tenant;
use App\Shared\Database\Traits\HasUuid;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class TenantWhatsAppSettings extends Model
{
    use HasUuid;

    protected $table = 'tenant_whatsapp_settings';

    protected $fillable = [
        'tenant_id',
        'enabled',
        'provider',
        'hosted_session_id',
        'hosted_phone_number',
        'hosted_status',
        'hosted_qr_payload',
        'hosted_connected_at',
        'hosted_last_seen_at',
        'hosted_expires_at',
        'phone_number_id',
        'access_token',
        'twilio_account_sid',
        'twilio_auth_token',
        'twilio_from',
    ];

    protected function casts(): array
    {
        return [
            'enabled' => 'boolean',
            'access_token' => 'encrypted',
            'twilio_auth_token' => 'encrypted',
            'hosted_connected_at' => 'datetime',
            'hosted_last_seen_at' => 'datetime',
            'hosted_expires_at' => 'datetime',
        ];
    }

    public function tenant(): BelongsTo
    {
        return $this->belongsTo(Tenant::class);
    }
}
