<?php

namespace App\Modules\CRM\Application\Services;

use App\Modules\CRM\Domain\Models\CrmProfile;
use App\Modules\CRM\Domain\Models\CrmTag;
use App\Modules\CRM\Domain\Models\CrmTagAssignment;
use App\Modules\CRM\Domain\Models\Customer;
use App\Modules\NotificationsCampaign\Application\Services\AudienceResolverService;
use App\Modules\Orders\Domain\Models\Order;
use App\Shared\Auth\PermissionService;
use App\Shared\Entitlements\FeatureAccessService;
use App\Shared\Tenancy\TenantContext;
use Illuminate\Support\Facades\DB;

class CrmService
{
    public function __construct(
        private TenantContext $tenantContext,
        private PermissionService $permissionService,
        private AudienceResolverService $audienceResolver,
        private FeatureAccessService $featureAccessService,
    ) {}

    public function listCustomers(array $permissions)
    {
        $this->permissionService->authorize($permissions, 'crm.view');

        return Customer::with('profile')->orderBy('name')->get()->map(function (Customer $customer) {
            if ($customer->profile) {
                $customer->profile->setAttribute('total_orders', $customer->profile->order_count);
                $customer->profile->setAttribute('last_order_date', $customer->profile->last_order_at);
                $customer->profile->setAttribute('segment', $this->audienceResolver->segmentForProfile($customer->profile));
            }

            return $customer;
        });
    }

    public function getInsights(array $permissions): array
    {
        $this->permissionService->authorize($permissions, 'crm.view');
        $this->featureAccessService->assertAccess('crm_basic');

        $profiles = CrmProfile::all();
        $totalCustomers = Customer::count();
        $returning = $profiles->whereBetween('order_count', [2, 5])->count();
        $loyal = $profiles->where('order_count', '>=', 5)->count();
        $avgOrderValue = $profiles->avg('average_order_value') ?? 0;

        $topCustomers = Customer::with('profile')
            ->get()
            ->sortByDesc(fn ($c) => (float) ($c->profile?->total_spent ?? 0))
            ->take(5)
            ->values()
            ->map(fn ($c) => [
                'id' => $c->id,
                'name' => $c->name,
                'total_spent' => (float) ($c->profile?->total_spent ?? 0),
                'order_count' => (int) ($c->profile?->order_count ?? 0),
                'segment' => $this->audienceResolver->segmentForProfile($c->profile),
            ]);

        return [
            'total_customers' => $totalCustomers,
            'returning_customers' => $returning,
            'loyal_customers' => $loyal,
            'average_order_value' => round((float) $avgOrderValue, 2),
            'top_customers' => $topCustomers,
        ];
    }

    public function getCustomer(string $id, array $permissions): Customer
    {
        $this->permissionService->authorize($permissions, 'crm.view');

        $customer = Customer::with(['profile'])->findOrFail($id);

        if ($customer->profile) {
            $customer->profile->setAttribute('total_orders', $customer->profile->order_count);
            $customer->profile->setAttribute('last_order_date', $customer->profile->last_order_at);
            $customer->profile->setAttribute('segment', $this->audienceResolver->segmentForProfile($customer->profile));
        }

        return $customer;
    }

    public function updateTags(string $customerId, array $tagIds, array $permissions): array
    {
        $this->permissionService->authorize($permissions, 'crm.manage');

        Customer::findOrFail($customerId);
        CrmTagAssignment::where('customer_id', $customerId)->delete();

        foreach ($tagIds as $tagId) {
            CrmTag::findOrFail($tagId);
            CrmTagAssignment::create([
                'tenant_id' => $this->tenantContext->id(),
                'customer_id' => $customerId,
                'tag_id' => $tagId,
            ]);
        }

        return CrmTagAssignment::where('customer_id', $customerId)->with('tag')->get()->all();
    }

    public function handleOrderCreated(Order $order): void
    {
        if (! $order->customer_id) {
            return;
        }

        DB::transaction(function () use ($order) {
            $profile = $this->getOrCreateProfile($order);
            $firstMealId = $order->items->first()?->meal_id;

            $profile->update([
                'order_count' => $profile->order_count + 1,
                'last_order_at' => now(),
                'favorite_meal_id' => $profile->favorite_meal_id ?? $firstMealId,
            ]);

            $this->recalculateComputedFields($profile);
        });
    }

    public function handleOrderCompleted(Order $order): void
    {
        if (! $order->customer_id) {
            return;
        }

        DB::transaction(function () use ($order) {
            $profile = $this->getOrCreateProfile($order);
            $firstMealId = $order->items->first()?->meal_id;

            $profile->update([
                'total_spent' => (float) $profile->total_spent + (float) $order->total_amount,
                'favorite_meal_id' => $firstMealId ?? $profile->favorite_meal_id,
            ]);

            $this->recalculateComputedFields($profile->fresh());
        });
    }

    public function handleOrderCancelled(Order $order): void
    {
        if (! $order->customer_id) {
            return;
        }

        DB::transaction(function () use ($order) {
            $profile = CrmProfile::where('customer_id', $order->customer_id)->first();

            if (! $profile) {
                return;
            }

            $profile->update([
                'order_count' => max(0, $profile->order_count - 1),
            ]);

            $this->recalculateComputedFields($profile->fresh());
        });
    }

    private function getOrCreateProfile(Order $order): CrmProfile
    {
        return CrmProfile::firstOrCreate(
            ['customer_id' => $order->customer_id, 'tenant_id' => $order->tenant_id],
            ['total_spent' => 0, 'order_count' => 0, 'created_at' => now()],
        );
    }

    private function recalculateComputedFields(CrmProfile $profile): void
    {
        $orderCount = max(1, $profile->order_count);
        $averageOrderValue = $profile->order_count > 0
            ? round((float) $profile->total_spent / $orderCount, 2)
            : 0;

        $profile->update([
            'average_order_value' => $averageOrderValue,
            'visit_frequency_score' => min(100, $profile->order_count * 10),
            'is_loyal' => $profile->order_count >= 5,
        ]);
    }
}
