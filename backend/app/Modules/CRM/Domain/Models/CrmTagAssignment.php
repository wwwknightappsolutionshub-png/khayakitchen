<?php

namespace App\Modules\CRM\Domain\Models;

use App\Shared\Database\Traits\BelongsToTenant;
use App\Shared\Database\Traits\HasTenant;
use App\Shared\Database\Traits\HasUuid;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class CrmTagAssignment extends Model
{
    use BelongsToTenant, HasTenant, HasUuid;

    public $timestamps = false;

    protected $fillable = [
        'tenant_id',
        'customer_id',
        'tag_id',
    ];

    public function tag(): BelongsTo
    {
        return $this->belongsTo(CrmTag::class, 'tag_id');
    }
}
