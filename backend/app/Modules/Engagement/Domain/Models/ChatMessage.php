<?php

namespace App\Modules\Engagement\Domain\Models;

use App\Shared\Database\Traits\HasUuid;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class ChatMessage extends Model
{
    use HasUuid;

    public $timestamps = false;

    protected $fillable = [
        'thread_id',
        'sender_type',
        'sender_user_id',
        'sender_customer_id',
        'sender_label',
        'body',
        'read_at',
        'created_at',
    ];

    protected function casts(): array
    {
        return [
            'read_at' => 'datetime',
            'created_at' => 'datetime',
        ];
    }

    public function thread(): BelongsTo
    {
        return $this->belongsTo(ChatThread::class, 'thread_id');
    }
}
