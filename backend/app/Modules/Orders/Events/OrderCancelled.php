<?php

namespace App\Modules\Orders\Events;

use App\Modules\Orders\Domain\Models\Order;
use Illuminate\Foundation\Events\Dispatchable;
use Illuminate\Queue\SerializesModels;

class OrderCancelled
{
    use Dispatchable, SerializesModels;

    public function __construct(public Order $order) {}
}
