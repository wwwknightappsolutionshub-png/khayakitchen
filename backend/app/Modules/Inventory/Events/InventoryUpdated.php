<?php

namespace App\Modules\Inventory\Events;

use App\Modules\Inventory\Domain\Models\InventoryItem;
use Illuminate\Foundation\Events\Dispatchable;
use Illuminate\Queue\SerializesModels;

class InventoryUpdated
{
    use Dispatchable, SerializesModels;

    public function __construct(
        public InventoryItem $item,
        public string $type,
        public float $quantity,
    ) {}
}
