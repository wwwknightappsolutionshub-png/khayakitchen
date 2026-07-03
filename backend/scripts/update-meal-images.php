<?php

use App\Modules\Menu\Domain\Models\Meal;
use Illuminate\Contracts\Console\Kernel;

require __DIR__.'/../vendor/autoload.php';

$app = require __DIR__.'/../bootstrap/app.php';
$app->make(Kernel::class)->bootstrap();

$images = [
    'Suya Skewers' => 'https://images.pexels.com/photos/36323856/pexels-photo-36323856.jpeg?auto=compress&cs=tinysrgb&w=600&h=600&fit=crop',
    'Pounded Yam' => 'https://images.unsplash.com/photo-1589302168068-964664d93dc0?auto=format&fit=crop&w=600&q=80',
    'Fried Plantain' => 'https://images.pexels.com/photos/6210449/pexels-photo-6210449.jpeg?auto=compress&cs=tinysrgb&w=600&h=600&fit=crop',
];

foreach ($images as $name => $url) {
    Meal::withoutGlobalScopes()->where('name', $name)->update(['image_url' => $url]);
}

echo "Updated ".count($images)." meal images\n";
