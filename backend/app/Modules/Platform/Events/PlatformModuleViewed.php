<?php

namespace App\Modules\Platform\Events;

use Illuminate\Foundation\Events\Dispatchable;
use Illuminate\Queue\SerializesModels;

class PlatformModuleViewed
{
    use Dispatchable, SerializesModels;

    public function __construct(public string $moduleKey) {}
}
