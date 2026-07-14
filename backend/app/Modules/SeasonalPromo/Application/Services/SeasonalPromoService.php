<?php

namespace App\Modules\SeasonalPromo\Application\Services;

use App\Modules\Menu\Domain\Models\Meal;
use App\Modules\Pricing\Application\Services\AuditLogService;
use App\Modules\SeasonalPromo\Domain\Models\SeasonalPromo;
use App\Shared\Auth\PermissionService;
use App\Shared\Entitlements\FeatureAccessService;
use App\Shared\Tenancy\TenantContext;
use Illuminate\Support\Facades\Storage;
use Illuminate\Validation\ValidationException;

class SeasonalPromoService
{
    public const FEATURE_KEY = 'seasonal_promo';

    public function __construct(
        private TenantContext $tenantContext,
        private PermissionService $permissionService,
        private FeatureAccessService $featureAccessService,
        private AuditLogService $auditLogService,
    ) {}

    public function show(array $permissions): array
    {
        $this->permissionService->authorize($permissions, 'branding.view');
        $this->featureAccessService->assertAccess(self::FEATURE_KEY);

        $promo = $this->findOrCreateDraft();

        return [
            'promo' => $promo,
            'free_until' => $this->featureAccessService->sharedFreeTrialEndsAt()?->toDateString(),
            'entitled' => true,
        ];
    }

    public function update(array $data, array $permissions): SeasonalPromo
    {
        $this->permissionService->authorize($permissions, 'branding.manage');
        $this->featureAccessService->assertAccess(self::FEATURE_KEY);

        if (! empty($data['meal_id'])) {
            $exists = Meal::where('id', $data['meal_id'])->exists();
            if (! $exists) {
                throw ValidationException::withMessages(['meal_id' => ['Meal not found on this menu.']]);
            }
        }

        $promo = $this->findOrCreateDraft();
        $promo->update([
            'headline' => $data['headline'] ?? $promo->headline,
            'subheadline' => $data['subheadline'] ?? $promo->subheadline,
            'details' => $data['details'] ?? $promo->details,
            'cta_label' => $data['cta_label'] ?? $promo->cta_label,
            'meal_id' => array_key_exists('meal_id', $data) ? $data['meal_id'] : $promo->meal_id,
            'is_published' => array_key_exists('is_published', $data)
                ? (bool) $data['is_published']
                : $promo->is_published,
        ]);

        if ($promo->is_published) {
            $this->assertPublishable($promo->fresh());
        }

        $this->auditLogService->log(
            'seasonal_promo.updated',
            $this->tenantContext->id(),
            $this->tenantContext->user()?->id,
            'seasonal_promo',
            $promo->id,
            ['is_published' => $promo->is_published],
        );

        return $promo->fresh();
    }

    public function uploadImage($file, array $permissions): SeasonalPromo
    {
        $this->permissionService->authorize($permissions, 'branding.manage');
        $this->featureAccessService->assertAccess(self::FEATURE_KEY);

        $tenantId = $this->tenantContext->id();
        $path = $file->store("tenants/{$tenantId}/seasonal-promo", 'public');
        $url = Storage::disk('public')->url($path);

        $promo = $this->findOrCreateDraft();
        $promo->update(['image_url' => $url]);

        return $promo->fresh();
    }

    /**
     * Public splash payload when entitled + published.
     *
     * @return array<string, mixed>|null
     */
    public function activePublicSplash(?string $tenantId = null): ?array
    {
        $tenantId = $tenantId ?? $this->tenantContext->id();
        if (! $tenantId || ! $this->featureAccessService->canAccess(self::FEATURE_KEY, $tenantId)) {
            return null;
        }

        $promo = SeasonalPromo::withoutGlobalScopes()
            ->where('tenant_id', $tenantId)
            ->where('is_published', true)
            ->first();

        if (! $promo || ! $promo->headline || ! $promo->meal_id) {
            return null;
        }

        return [
            'id' => $promo->id,
            'image_url' => $promo->image_url,
            'headline' => $promo->headline,
            'subheadline' => $promo->subheadline,
            'details' => $promo->details,
            'cta_label' => $promo->cta_label ?: 'View on menu',
            'meal_id' => $promo->meal_id,
            'menu_hash' => '#meal-'.$promo->meal_id,
        ];
    }

    private function findOrCreateDraft(): SeasonalPromo
    {
        $tenantId = $this->tenantContext->id();

        return SeasonalPromo::firstOrCreate(
            ['tenant_id' => $tenantId],
            [
                'cta_label' => 'View on menu',
                'is_published' => false,
            ],
        );
    }

    private function assertPublishable(SeasonalPromo $promo): void
    {
        $errors = [];
        if (! $promo->headline) {
            $errors['headline'] = ['Headline is required to publish.'];
        }
        if (! $promo->meal_id) {
            $errors['meal_id'] = ['Link a menu meal for the CTA before publishing.'];
        }
        if ($errors !== []) {
            throw ValidationException::withMessages($errors);
        }
    }
}
