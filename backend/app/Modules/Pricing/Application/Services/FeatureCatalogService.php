<?php

namespace App\Modules\Pricing\Application\Services;

use App\Modules\Pricing\Domain\Models\Feature;

class FeatureCatalogService
{
    public function listFeatures(bool $grouped = true)
    {
        $query = Feature::query()->orderBy('category')->orderBy('name');

        if ($grouped) {
            return $query->get()->groupBy('category');
        }

        return $query->get();
    }

    public function getFeature(string $id): Feature
    {
        return Feature::withTrashed()->findOrFail($id);
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
        unset($data['key']);
        $feature->update($data);
        app(AuditLogService::class)->log('feature.updated', null, $userId, 'feature', $feature->id, $data);

        return $feature;
    }

    public function deleteFeature(string $id, ?string $userId): void
    {
        $feature = Feature::findOrFail($id);
        $feature->update(['status' => 'archived']);
        $feature->delete();
        app(AuditLogService::class)->log('feature.deleted', null, $userId, 'feature', $id);
    }

    public function restoreFeature(string $id, ?string $userId): Feature
    {
        $feature = Feature::withTrashed()->findOrFail($id);
        $feature->restore();
        $feature->update(['status' => 'active']);
        app(AuditLogService::class)->log('feature.restored', null, $userId, 'feature', $id);

        return $feature;
    }
}
