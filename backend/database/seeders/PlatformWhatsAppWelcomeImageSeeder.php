<?php

namespace Database\Seeders;

use App\Modules\Notifications\Application\Services\PlatformWhatsAppWelcomeImageService;
use Illuminate\Database\Seeder;

class PlatformWhatsAppWelcomeImageSeeder extends Seeder
{
    public function run(): void
    {
        app(PlatformWhatsAppWelcomeImageService::class)->ensureSeeded();
    }
}
