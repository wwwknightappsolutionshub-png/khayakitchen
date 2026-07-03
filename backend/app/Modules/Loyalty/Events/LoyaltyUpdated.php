<?php

namespace App\Modules\Loyalty\Events;

use App\Modules\Loyalty\Domain\Models\LoyaltyAccount;
use Illuminate\Foundation\Events\Dispatchable;
use Illuminate\Queue\SerializesModels;

class LoyaltyUpdated
{
    use Dispatchable, SerializesModels;

    public function __construct(
        public LoyaltyAccount $account,
        public string $type,
        public int $points,
    ) {}
}
