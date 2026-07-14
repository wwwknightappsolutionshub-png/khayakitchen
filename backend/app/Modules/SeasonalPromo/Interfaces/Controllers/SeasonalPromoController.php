<?php

namespace App\Modules\SeasonalPromo\Interfaces\Controllers;

use App\Modules\SeasonalPromo\Application\Services\SeasonalPromoService;
use App\Shared\Utils\ApiResponse;
use Illuminate\Http\Request;
use Illuminate\Routing\Controller;

class SeasonalPromoController extends Controller
{
    public function __construct(private SeasonalPromoService $seasonalPromoService) {}

    public function show(Request $request)
    {
        return ApiResponse::success(
            $this->seasonalPromoService->show($request->get('permissions', [])),
        );
    }

    public function update(Request $request)
    {
        $data = $request->validate([
            'headline' => ['nullable', 'string', 'max:160'],
            'subheadline' => ['nullable', 'string', 'max:240'],
            'details' => ['nullable', 'string', 'max:5000'],
            'cta_label' => ['nullable', 'string', 'max:80'],
            'meal_id' => ['nullable', 'uuid'],
            'is_published' => ['nullable', 'boolean'],
        ]);

        $promo = $this->seasonalPromoService->update($data, $request->get('permissions', []));

        return ApiResponse::success(['promo' => $promo]);
    }

    public function uploadImage(Request $request)
    {
        $request->validate([
            'image' => ['required', 'image', 'max:5120'],
        ]);

        $promo = $this->seasonalPromoService->uploadImage(
            $request->file('image'),
            $request->get('permissions', []),
        );

        return ApiResponse::success(['promo' => $promo]);
    }
}
