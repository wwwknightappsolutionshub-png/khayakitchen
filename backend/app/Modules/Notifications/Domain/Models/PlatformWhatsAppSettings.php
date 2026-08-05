<?php

namespace App\Modules\Notifications\Domain\Models;

use App\Shared\Database\Traits\HasUuid;
use Illuminate\Database\Eloquent\Model;

class PlatformWhatsAppSettings extends Model
{
    use HasUuid;

    protected $table = 'platform_whatsapp_settings';

    protected $fillable = [
        'enabled',
        'provider',
        'api_key',
        'session_id',
        'base_url',
        'meta_phone_number_id',
        'meta_access_token',
        'twilio_account_sid',
        'twilio_auth_token',
        'twilio_from',
    ];

    protected function casts(): array
    {
        return [
            'enabled' => 'boolean',
            'api_key' => 'encrypted',
            'meta_access_token' => 'encrypted',
            'twilio_auth_token' => 'encrypted',
        ];
    }
}
