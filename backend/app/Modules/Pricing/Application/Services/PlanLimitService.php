<?php

namespace App\Modules\Pricing\Application\Services;

use App\Modules\Auth\Domain\Models\FeatureFlag;
use App\Modules\CRM\Domain\Models\Customer;
use App\Modules\Menu\Domain\Models\Meal;
use App\Modules\Orders\Domain\Models\Order;
use App\Modules\Pricing\Domain\Models\TenantSubscription;
use App\Shared\Entitlements\FeatureAccessService;
use App\Shared\Tenancy\TenantContext;
use Illuminate\Validation\ValidationException;

class PlanLimitService
{
    public function __construct(
        private FeatureAccessService $featureAccess,
        private TenantContext $tenantContext,
    ) {}

    public function assertMenuLimit(?string $tenantId = null): void
    {
        $tenantId = $tenantId ?? $this->tenantContext->id();
        $limits = $this->featureAccess->getLimits($tenantId);
        if (! $limits) {
            return;
        }

        $count = Meal::withoutGlobalScopes()->where('tenant_id', $tenantId)->count();
        if ($count >= $limits->maxMenuItems) {
            throw ValidationException::withMessages([
                'limit' => ["Menu item limit reached ({$limits->maxMenuItems}). Upgrade your plan."],
            ]);
        }
    }

    public function assertOrderLimit(?string $tenantId = null): void
    {
        $tenantId = $tenantId ?? $this->tenantContext->id();
        $limits = $this->featureAccess->getLimits($tenantId);
        if (! $limits) {
            return;
        }

        $todayCount = Order::withoutGlobalScopes()
            ->where('tenant_id', $tenantId)
            ->where('created_at', '>=', now()->startOfDay())
            ->count();

        if ($todayCount >= $limits->maxOrdersPerDay) {
            throw ValidationException::withMessages([
                'limit' => ["Daily order limit reached ({$limits->maxOrdersPerDay}). Upgrade your plan."],
            ]);
        }
    }

    public function assertCustomerLimit(?string $tenantId = null): void
    {
        $tenantId = $tenantId ?? $this->tenantContext->id();
        $limits = $this->featureAccess->getLimits($tenantId);
        if (! $limits) {
            return;
        }

        $count = Customer::withoutGlobalScopes()->where('tenant_id', $tenantId)->count();
        if ($count >= $limits->maxCustomers) {
            throw ValidationException::withMessages([
                'limit' => ["Customer limit reached ({$limits->maxCustomers}). Upgrade your plan."],
            ]);
        }
    }
}
