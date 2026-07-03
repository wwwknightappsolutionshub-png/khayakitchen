<?php

namespace App\Modules\NotificationsCampaign\Domain\Models;

use App\Modules\CRM\Domain\Models\Customer;
use App\Shared\Database\Traits\BelongsToTenant;
use App\Shared\Database\Traits\HasTenant;
use App\Shared\Database\Traits\HasUuid;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class CustomerNotificationPreference extends Model
{
    use BelongsToTenant, HasTenant, HasUuid;

    protected $fillable = [
        'tenant_id',
        'customer_id',
        'push_enabled',
        'whatsapp_enabled',
        'email_enabled',
    ];

    protected function casts(): array
    {
        return [
            'push_enabled' => 'boolean',
            'whatsapp_enabled' => 'boolean',
            'email_enabled' => 'boolean',
        ];
    }

    public function customer(): BelongsTo
    {
        return $this->belongsTo(Customer::class);
    }
}
