<?php

namespace App\Modules\Realtime\Broadcasts;

use Illuminate\Broadcasting\Channel;
use Illuminate\Broadcasting\InteractsWithSockets;
use Illuminate\Broadcasting\PrivateChannel;
use Illuminate\Contracts\Broadcasting\ShouldBroadcastNow;
use Illuminate\Foundation\Events\Dispatchable;
use Illuminate\Queue\SerializesModels;

class RealtimeMessage implements ShouldBroadcastNow
{
    use Dispatchable, InteractsWithSockets, SerializesModels;

    public function __construct(
        public string $tenantId,
        public string $channel,
        public string $event,
        public array $payload,
    ) {}

    public function broadcastOn(): array
    {
        if ($this->channel === 'customer') {
            return [new Channel("tenant.{$this->tenantId}.customer")];
        }

        return [new PrivateChannel("tenant.{$this->tenantId}.{$this->channel}")];
    }

    public function broadcastAs(): string
    {
        return $this->event;
    }

    public function broadcastWith(): array
    {
        return $this->payload;
    }
}
