<?php

namespace App\Modules\Orders\Domain\Models;

use App\Shared\Database\Traits\BelongsToTenant;
use App\Shared\Database\Traits\HasTenant;
use App\Shared\Database\Traits\HasUuid;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;

class Payment extends Model
{
    use BelongsToTenant, HasTenant, HasUuid, SoftDeletes;

    public $timestamps = false;

    protected $fillable = [
        'tenant_id',
        'order_id',
        'provider',
        'status',
        'amount',
        'proof_path',
        'proof_mime',
        'proof_original_name',
        'proof_size',
        'proof_wait_started_at',
        'proof_uploaded_at',
        'verified_at',
        'verified_by',
        'created_at',
    ];

    protected function casts(): array
    {
        return [
            'amount' => 'decimal:2',
            'proof_size' => 'integer',
            'proof_wait_started_at' => 'datetime',
            'proof_uploaded_at' => 'datetime',
            'verified_at' => 'datetime',
            'created_at' => 'datetime',
        ];
    }
}
