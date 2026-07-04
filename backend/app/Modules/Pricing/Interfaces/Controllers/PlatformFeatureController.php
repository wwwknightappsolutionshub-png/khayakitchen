<?php

namespace App\Modules\Pricing\Interfaces\Controllers;

use App\Modules\Pricing\Application\Services\FeatureCatalogService;
use App\Shared\Utils\ApiResponse;
use Illuminate\Http\Request;
use Illuminate\Routing\Controller;

class PlatformFeatureController extends Controller
{
    public function __construct(private FeatureCatalogService $featureCatalogService) {}

    public function index(Request $request)
    {
        $grouped = $request->boolean('grouped', true);

        return ApiResponse::success([
            'features' => $this->featureCatalogService->listFeatures($grouped),
        ]);
    }

    public function show(string $id)
    {
        return ApiResponse::success(['feature' => $this->featureCatalogService->getFeature($id)]);
    }

    public function store(Request $request)
    {
        $data = $request->validate([
            'key' => ['required', 'string', 'max:80', 'unique:features,key'],
            'name' => ['required', 'string', 'max:120'],
            'description' => ['nullable', 'string'],
            'category' => ['required', 'string', 'max:40'],
            'icon' => ['nullable', 'string', 'max:64'],
            'module' => ['nullable', 'string', 'max:64'],
            'status' => ['nullable', 'string', 'max:32'],
            'internal_notes' => ['nullable', 'string'],
        ]);

        $feature = $this->featureCatalogService->createFeature($data, $request->user()?->id);

        return ApiResponse::success(['feature' => $feature], 201);
    }

    public function update(Request $request, string $id)
    {
        $data = $request->validate([
            'name' => ['sometimes', 'string', 'max:120'],
            'description' => ['nullable', 'string'],
            'category' => ['sometimes', 'string', 'max:40'],
            'icon' => ['nullable', 'string', 'max:64'],
            'module' => ['nullable', 'string', 'max:64'],
            'status' => ['nullable', 'string', 'max:32'],
            'internal_notes' => ['nullable', 'string'],
        ]);

        $feature = $this->featureCatalogService->updateFeature($id, $data, $request->user()?->id);

        return ApiResponse::success(['feature' => $feature]);
    }

    public function destroy(Request $request, string $id)
    {
        $this->featureCatalogService->deleteFeature($id, $request->user()?->id);

        return ApiResponse::success(['deleted' => true]);
    }

    public function restore(Request $request, string $id)
    {
        $feature = $this->featureCatalogService->restoreFeature($id, $request->user()?->id);

        return ApiResponse::success(['feature' => $feature]);
    }
}
