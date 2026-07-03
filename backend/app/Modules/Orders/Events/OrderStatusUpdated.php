<?php

namespace App\Modules\Orders\Events;

use App\Modules\Orders\Domain\Models\Order;
use Illuminate\Foundation\Events\Dispatchable;
use Illuminate\Queue\SerializesModels;

class OrderStatusUpdated
{
    use Dispatchable, SerializesModels;

    public function __construct(
        public Order $order,
        public string $previousStatus,
    ) {}
}
