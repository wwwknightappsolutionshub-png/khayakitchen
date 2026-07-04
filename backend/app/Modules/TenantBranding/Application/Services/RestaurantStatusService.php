<?php

namespace App\Modules\TenantBranding\Application\Services;

use App\Modules\Menu\Domain\Models\Meal;
use App\Modules\Pricing\Application\Services\AuditLogService;
use App\Modules\TenantBranding\Domain\Models\RestaurantStatus;
use App\Modules\TenantBranding\Events\PromoModeActivated;
use App\Modules\TenantBranding\Events\RestaurantStatusChanged;
use App\Shared\Auth\PermissionService;
use App\Shared\Tenancy\TenantContext;
use Carbon\Carbon;
use Illuminate\Validation\ValidationException;

class RestaurantStatusService
{
    public function __construct(
        private TenantContext $tenantContext,
        private PermissionService $permissionService,
        private AuditLogService $auditLogService,
    ) {}

    public function getForTenant(?string $tenantId = null): RestaurantStatus
    {
        $tenantId = $tenantId ?? $this->tenantContext->id();

        return RestaurantStatus::withoutGlobalScopes()->firstOrCreate(
            ['tenant_id' => $tenantId],
            [
                'status' => RestaurantStatus::STATUS_OPEN,
                'is_accepting_orders' => true,
                'promo_alerts_enabled' => true,
            ],
        );
    }

    public function isAcceptingOrders(?string $tenantId = null): bool
    {
        return $this->getForTenant($tenantId)->is_accepting_orders;
    }

    public function assertAcceptingOrders(?string $tenantId = null): void
    {
        $status = $this->getForTenant($tenantId);

        if (! $status->is_accepting_orders) {
            throw ValidationException::withMessages([
                'status' => ['Restaurant is currently closed and not accepting orders.'],
            ]);
        }
    }

    public function updateStatus(
        string $status,
        array $permissions,
        ?bool $promoAlertsEnabled = null,
        ?string $reason = null,
        bool $isSuperAdminOverride = false,
        ?Carbon $closingAt = null,
        ?Carbon $promoEndsAt = null,
        ?array $promoMeals = null,
    ): RestaurantStatus {
        if (! $isSuperAdminOverride) {
            $this->permissionService->authorize($permissions, 'branding.manage');
        }

        $valid = [
            RestaurantStatus::STATUS_OPEN,
            RestaurantStatus::STATUS_CLOSING_SOON,
            RestaurantStatus::STATUS_CLOSED,
            RestaurantStatus::STATUS_PROMO_MODE,
        ];

        if (! in_array($status, $valid, true)) {
            throw ValidationException::withMessages(['status' => ['Invalid restaurant status.']]);
        }

        if ($status === RestaurantStatus::STATUS_CLOSING_SOON && $closingAt === null && ! $isSuperAdminOverride) {
            throw ValidationException::withMessages([
                'closing_at' => ['Please set when the kitchen closes.'],
            ]);
        }

        if ($status === RestaurantStatus::STATUS_PROMO_MODE && $promoEndsAt === null && ! $isSuperAdminOverride) {
            throw ValidationException::withMessages([
                'promo_ends_at' => ['Please set when the promo ends.'],
            ]);
        }

        if ($status === RestaurantStatus::STATUS_PROMO_MODE && empty($promoMeals) && ! $isSuperAdminOverride) {
            throw ValidationException::withMessages([
                'promo_meals' => ['Select at least one menu item for the promo.'],
            ]);
        }

        $record = $this->getForTenant();
        $previous = $record->status;

        $isAccepting = ! in_array($status, [RestaurantStatus::STATUS_CLOSED], true);

        $updates = [
            'status' => $status,
            'is_accepting_orders' => $isAccepting,
            'previous_status' => $previous,
            'updated_by' => $this->tenantContext->user()?->id,
            'promo_alerts_enabled' => $promoAlertsEnabled ?? $record->promo_alerts_enabled,
        ];

        if ($status === RestaurantStatus::STATUS_CLOSING_SOON) {
            $updates['closing_at'] = $closingAt ?? now()->addMinutes(30);
            $updates['promo_ends_at'] = null;
            $updates['promo_meals'] = null;
        } elseif ($status === RestaurantStatus::STATUS_PROMO_MODE) {
            $updates['promo_ends_at'] = $promoEndsAt ?? now()->addHours(2);
            $updates['closing_at'] = null;
            $updates['promo_meals'] = $promoMeals ?? $record->promo_meals;
        } else {
            $updates['closing_at'] = null;
            $updates['promo_ends_at'] = null;
            $updates['promo_meals'] = null;
        }

        $hasTimerOrMealChange = $closingAt !== null
            || $promoEndsAt !== null
            || $promoMeals !== null
            || $promoAlertsEnabled !== null;

        if ($previous === $status && ! $hasTimerOrMealChange) {
            return $record;
        }

        $record->update($updates);

        $action = $isSuperAdminOverride ? 'status.override' : 'status.changed';
        $this->auditLogService->log(
            $action,
            $record->tenant_id,
            $this->tenantContext->user()?->id,
            'restaurant_status',
            $record->id,
            [
                'from' => $previous,
                'to' => $status,
                'closing_at' => $updates['closing_at'] ?? null,
                'promo_ends_at' => $updates['promo_ends_at'] ?? null,
                'promo_meals' => $updates['promo_meals'] ?? null,
            ],
            $reason,
        );

        RestaurantStatusChanged::dispatch($record->fresh(), $previous);

        if ($status === RestaurantStatus::STATUS_PROMO_MODE && $previous !== RestaurantStatus::STATUS_PROMO_MODE) {
            PromoModeActivated::dispatch($record->fresh());
        }

        return $record->fresh();
    }

    public function getStorefront(?string $tenantId = null): array
    {
        $tenantId = $tenantId ?? $this->tenantContext->id();
        $brandingService = app(BrandingService::class);
        $branding = $brandingService->getForTenant($tenantId);
        $status = $this->getForTenant($tenantId);

        $statusPayload = $status->toArray();
        $statusPayload['promo_meals'] = $this->resolvePromoMealsForStorefront($status, $tenantId);

        return [
            'branding' => $brandingService->resolveEffective($branding),
            'status' => $statusPayload,
        ];
    }

    /**
     * @return array<int, array<string, mixed>>
     */
    private function resolvePromoMealsForStorefront(RestaurantStatus $status, string $tenantId): array
    {
        if ($status->status !== RestaurantStatus::STATUS_PROMO_MODE) {
            return [];
        }

        $items = $status->promo_meals ?? [];
        if ($items === []) {
            return [];
        }

        $mealIds = array_values(array_filter(array_column($items, 'meal_id')));
        if ($mealIds === []) {
            return [];
        }

        $meals = Meal::withoutGlobalScopes()
            ->where('tenant_id', $tenantId)
            ->whereIn('id', $mealIds)
            ->where('is_active', true)
            ->get()
            ->keyBy('id');

        $resolved = [];

        foreach ($items as $item) {
            $mealId = $item['meal_id'] ?? null;
            if (! $mealId || ! $meals->has($mealId)) {
                continue;
            }

            $meal = $meals->get($mealId);
            $discount = max(1, min(90, (int) ($item['discount_percent'] ?? 10)));
            $basePrice = (float) $meal->base_price;
            $promoPrice = round($basePrice * (1 - $discount / 100), 2);

            $resolved[] = [
                'meal_id' => $meal->id,
                'discount_percent' => $discount,
                'name' => $meal->name,
                'description' => $meal->description,
                'image_url' => $meal->image_url,
                'base_price' => $basePrice,
                'promo_price' => $promoPrice,
            ];
        }

        return $resolved;
    }
}
