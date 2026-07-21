<?php

namespace App\Modules\CRM\Domain\Models;

use App\Shared\Database\Traits\BelongsToTenant;
use App\Shared\Database\Traits\HasTenant;
use App\Shared\Database\Traits\HasUuid;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class CustomerCustomMealRequest extends Model
{
    use BelongsToTenant, HasTenant, HasUuid;

    public const STATUS_SUBMITTED = 'submitted';

    public const STATUS_ACKNOWLEDGED = 'acknowledged';

    public const STATUS_CLOSED = 'closed';

    protected $fillable = [
        'tenant_id',
        'customer_id',
        'title',
        'message',
        'constraints',
        'status',
        'handled_by',
        'acknowledged_at',
        'closed_at',
        'staff_note',
    ];

    protected function casts(): array
    {
        return [
            'acknowledged_at' => 'datetime',
            'closed_at' => 'datetime',
        ];
    }

    public function customer(): BelongsTo
    {
        return $this->belongsTo(Customer::class);
    }
}
