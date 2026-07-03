<?php

namespace App\Modules\Pricing\Application\Services;

use App\Modules\Pricing\Domain\Models\Feature;

class FeatureCatalogService
{
    public function listFeatures()
    {
        return Feature::orderBy('category')->orderBy('name')->get()->groupBy('category');
    }

    public function createFeature(array $data, ?string $userId): Feature
    {
        $feature = Feature::create($data);

        app(AuditLogService::class)->log('feature.created', null, $userId, 'feature', $feature->id, $data);

        return $feature;
    }

    public function updateFeature(string $id, array $data, ?string $userId): Feature
    {
        $feature = Feature::findOrFail($id);
        $feature->update($data);

        app(AuditLogService::class)->log('feature.updated', null, $userId, 'feature', $feature->id, $data);

        return $feature;
    }
}
