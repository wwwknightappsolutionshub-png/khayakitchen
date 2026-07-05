<?php

namespace App\Modules\RevenueRecovery\Application\Services;

use App\Modules\Pricing\Application\Services\AuditLogService;
use App\Modules\Pricing\Application\Services\PlanLimitService;
use App\Modules\RevenueRecovery\Domain\Models\RevenueRecoveryCampaign;
use App\Modules\RevenueRecovery\Jobs\DeliverRevenueRecoveryNotificationJob;
use App\Modules\TenantBranding\Application\Services\BrandingService;
use App\Shared\Auth\PermissionService;
use App\Shared\Entitlements\FeatureAccessService;
use App\Shared\Tenancy\TenantContext;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

class RevenueRecoveryCampaignService
{
    public const FEATURE_KEY = 'revenue_recovery';

    public function __construct(
        private TenantContext $tenantContext,
        private PermissionService $permissionService,
        private FeatureAccessService $featureAccessService,
        private PlanLimitService $planLimitService,
        private AuditLogService $auditLogService,
        private BrandingService $brandingService,
        private RevenueRecoveryPricingService $pricingService,
    ) {}

    public function list(array $permissions, ?string $status = null)
    {
        $this->authorizeView($permissions);
        $this->ensureEnabled();

        $query = RevenueRecoveryCampaign::orderByDesc('created_at');
        if ($status) {
            $query->where('status', $status);
        }

        return $query->get();
    }

    public function show(string $id, array $permissions): RevenueRecoveryCampaign
    {
        $this->authorizeView($permissions);
        $this->ensureEnabled();

        return RevenueRecoveryCampaign::findOrFail($id);
    }

    public function create(array $data, array $permissions): RevenueRecoveryCampaign
    {
        $this->authorizeManage($permissions);
        $this->ensureEnabled();
        $this->assertOwnerRole();
        $this->validatePayload($data);

        $campaign = RevenueRecoveryCampaign::create([
            ...$this->mapPayload($data),
            'status' => RevenueRecoveryCampaign::STATUS_DRAFT,
            'created_by' => $this->tenantContext->user()?->id,
        ]);

        $this->audit('revenue_recovery.created', $campaign);

        return $campaign;
    }

    public function update(string $id, array $data, array $permissions): RevenueRecoveryCampaign
    {
        $this->authorizeManage($permissions);
        $this->ensureEnabled();
        $this->assertOwnerRole();

        $campaign = RevenueRecoveryCampaign::findOrFail($id);
        if (! in_array($campaign->status, [
            RevenueRecoveryCampaign::STATUS_DRAFT,
            RevenueRecoveryCampaign::STATUS_PAUSED,
            RevenueRecoveryCampaign::STATUS_DEACTIVATED,
        ], true)) {
            throw ValidationException::withMessages([
                'status' => ['Only draft, paused, or deactivated campaigns can be edited.'],
            ]);
        }

        $this->validatePayload($data, $campaign);
        $campaign->update($this->mapPayload($data));
        $this->audit('revenue_recovery.updated', $campaign);

        return $campaign->fresh();
    }

    public function duplicate(string $id, array $permissions): RevenueRecoveryCampaign
    {
        $this->authorizeManage($permissions);
        $this->ensureEnabled();
        $this->assertOwnerRole();

        $source = RevenueRecoveryCampaign::findOrFail($id);

        $copy = RevenueRecoveryCampaign::create([
            'name' => $source->name.' (Copy)',
            'campaign_type' => $source->campaign_type,
            'discount_type' => $source->discount_type,
            'discount_value' => $source->discount_value,
            'meal_ids' => $source->meal_ids,
            'starts_at' => now()->addHour(),
            'ends_at' => now()->addHours(3),
            'status' => RevenueRecoveryCampaign::STATUS_DRAFT,
            'notifications_enabled' => $source->notifications_enabled,
            'notification_title' => $source->notification_title,
            'notification_message' => $source->notification_message,
            'target_audience' => $source->target_audience,
            'redemption_limit' => $source->redemption_limit,
            'created_by' => $this->tenantContext->user()?->id,
            'duplicated_from_id' => $source->id,
        ]);

        $this->audit('revenue_recovery.duplicated', $copy, ['from' => $source->id]);

        return $copy;
    }

    public function activate(string $id, array $permissions): RevenueRecoveryCampaign
    {
        $this->authorizeManage($permissions);
        $this->ensureEnabled();
        $this->assertOwnerRole();
        $this->planLimitService->assertPromotionLimit();

        $campaign = RevenueRecoveryCampaign::findOrFail($id);
        if (! in_array($campaign->status, [
            RevenueRecoveryCampaign::STATUS_DRAFT,
            RevenueRecoveryCampaign::STATUS_PAUSED,
            RevenueRecoveryCampaign::STATUS_DEACTIVATED,
            RevenueRecoveryCampaign::STATUS_SCHEDULED,
        ], true)) {
            throw ValidationException::withMessages(['status' => ['Campaign cannot be activated from its current state.']]);
        }

        if ($campaign->ends_at <= now()) {
            throw ValidationException::withMessages(['ends_at' => ['Campaign end time must be in the future.']]);
        }

        $status = $campaign->starts_at > now()
            ? RevenueRecoveryCampaign::STATUS_SCHEDULED
            : RevenueRecoveryCampaign::STATUS_ACTIVE;

        $campaign->update([
            'status' => $status,
            'activated_at' => $status === RevenueRecoveryCampaign::STATUS_ACTIVE ? now() : $campaign->activated_at,
        ]);

        if ($status === RevenueRecoveryCampaign::STATUS_ACTIVE && $campaign->notifications_enabled) {
            $this->dispatchNotification($campaign);
        }

        $this->audit('revenue_recovery.activated', $campaign);

        return $campaign->fresh();
    }

    public function pause(string $id, array $permissions): RevenueRecoveryCampaign
    {
        $campaign = $this->transition($id, $permissions, [RevenueRecoveryCampaign::STATUS_ACTIVE], RevenueRecoveryCampaign::STATUS_PAUSED);
        $this->audit('revenue_recovery.paused', $campaign);

        return $campaign;
    }

    public function resume(string $id, array $permissions): RevenueRecoveryCampaign
    {
        $this->planLimitService->assertPromotionLimit();
        $campaign = $this->transition($id, $permissions, [RevenueRecoveryCampaign::STATUS_PAUSED], RevenueRecoveryCampaign::STATUS_ACTIVE);
        $this->audit('revenue_recovery.resumed', $campaign);

        return $campaign;
    }

    public function deactivate(string $id, array $permissions): RevenueRecoveryCampaign
    {
        $campaign = $this->transition($id, $permissions, [
            RevenueRecoveryCampaign::STATUS_ACTIVE,
            RevenueRecoveryCampaign::STATUS_PAUSED,
            RevenueRecoveryCampaign::STATUS_SCHEDULED,
        ], RevenueRecoveryCampaign::STATUS_DEACTIVATED);
        $this->audit('revenue_recovery.deactivated', $campaign);

        return $campaign;
    }

    public function archive(string $id, array $permissions): RevenueRecoveryCampaign
    {
        $this->authorizeManage($permissions);
        $this->ensureEnabled();
        $this->assertOwnerRole();

        $campaign = RevenueRecoveryCampaign::findOrFail($id);
        if (! in_array($campaign->status, [
            RevenueRecoveryCampaign::STATUS_DEACTIVATED,
            RevenueRecoveryCampaign::STATUS_DRAFT,
        ], true)) {
            throw ValidationException::withMessages(['status' => ['Deactivate the campaign before archiving.']]);
        }

        $campaign->update([
            'status' => RevenueRecoveryCampaign::STATUS_ARCHIVED,
            'archived_at' => now(),
        ]);
        $this->audit('revenue_recovery.archived', $campaign);

        return $campaign->fresh();
    }

    public function delete(string $id, array $permissions): void
    {
        $this->authorizeManage($permissions);
        $this->ensureEnabled();
        $this->assertOwnerRole();

        $campaign = RevenueRecoveryCampaign::findOrFail($id);
        if (! in_array($campaign->status, [
            RevenueRecoveryCampaign::STATUS_DRAFT,
            RevenueRecoveryCampaign::STATUS_ARCHIVED,
        ], true)) {
            throw ValidationException::withMessages(['status' => ['Only draft or archived campaigns can be deleted.']]);
        }

        $this->audit('revenue_recovery.deleted', $campaign);
        $campaign->delete();
    }

    public function sendNotification(string $id, array $permissions): RevenueRecoveryCampaign
    {
        $this->authorizeManage($permissions);
        $this->ensureEnabled();
        $this->assertOwnerRole();

        $campaign = RevenueRecoveryCampaign::findOrFail($id);
        if (! in_array($campaign->status, [
            RevenueRecoveryCampaign::STATUS_ACTIVE,
            RevenueRecoveryCampaign::STATUS_SCHEDULED,
        ], true)) {
            throw ValidationException::withMessages(['status' => ['Notifications can only be sent for active or scheduled campaigns.']]);
        }

        $this->dispatchNotification($campaign);
        $this->audit('revenue_recovery.notification_sent', $campaign);

        return $campaign->fresh();
    }

    /**
     * @return array<string, mixed>
     */
    public function getDashboard(array $permissions): array
    {
        $this->authorizeView($permissions);
        $this->ensureEnabled();

        $tenantId = $this->tenantContext->id();
        $campaigns = RevenueRecoveryCampaign::withoutGlobalScopes()->where('tenant_id', $tenantId);

        $active = (clone $campaigns)->where('status', RevenueRecoveryCampaign::STATUS_ACTIVE)->count();
        $totalOrders = (clone $campaigns)->sum('orders_count');
        $recovered = (float) (clone $campaigns)->sum('recovered_revenue');
        $notificationsSent = (clone $campaigns)->sum('notifications_sent');
        $notificationsDelivered = (clone $campaigns)->sum('notifications_delivered');
        $notificationsOpened = (clone $campaigns)->sum('notifications_opened');
        $discountedItemsSold = (clone $campaigns)->sum('discounted_items_sold');

        $redemptions = (clone $campaigns)->sum('redemption_count');
        $redemptionRate = $notificationsOpened > 0
            ? round(($totalOrders / $notificationsOpened) * 100, 1)
            : 0.0;
        $notificationOpenRate = $notificationsDelivered > 0
            ? round(($notificationsOpened / $notificationsDelivered) * 100, 1)
            : 0.0;

        return [
            'campaigns_total' => (clone $campaigns)->count(),
            'campaigns_active' => $active,
            'notifications_sent' => $notificationsSent,
            'notifications_delivered' => $notificationsDelivered,
            'notifications_opened' => $notificationsOpened,
            'notification_open_rate' => $notificationOpenRate,
            'campaign_orders' => $totalOrders,
            'recovered_revenue' => $recovered,
            'meals_sold' => $discountedItemsSold,
            'redemption_rate' => $redemptionRate,
            'redemptions' => $redemptions,
            'recent_campaigns' => RevenueRecoveryCampaign::orderByDesc('updated_at')->limit(8)->get(),
            'active_offers' => $this->pricingService->getStorefrontOffers($tenantId),
        ];
    }

    /**
     * @return array<string, mixed>
     */
    public function getStorefrontPayload(?string $tenantId = null): array
    {
        $tenantId = $tenantId ?? $this->tenantContext->id();

        if (! $this->featureAccessService->canAccess(self::FEATURE_KEY, $tenantId)) {
            return ['offers' => [], 'campaigns' => []];
        }

        $offers = $this->pricingService->getStorefrontOffers($tenantId);
        $activeCampaigns = RevenueRecoveryCampaign::withoutGlobalScopes()
            ->where('tenant_id', $tenantId)
            ->where('status', RevenueRecoveryCampaign::STATUS_ACTIVE)
            ->where('starts_at', '<=', now())
            ->where('ends_at', '>=', now())
            ->get(['id', 'name', 'campaign_type', 'ends_at', 'discount_type', 'discount_value']);

        return [
            'offers' => $offers,
            'campaigns' => $activeCampaigns,
        ];
    }

    public function recordOrderMetrics(?RevenueRecoveryCampaign $campaign, float $discountTotal, int $discountedItemCount): void
    {
        if (! $campaign) {
            return;
        }

        DB::transaction(function () use ($campaign, $discountTotal, $discountedItemCount) {
            $locked = RevenueRecoveryCampaign::withoutGlobalScopes()->lockForUpdate()->find($campaign->id);
            if (! $locked) {
                return;
            }

            $locked->increment('orders_count');
            $locked->increment('redemption_count');
            $locked->increment('discounted_items_sold', max(1, $discountedItemCount));
            $locked->increment('recovered_revenue', $discountTotal);
        });
    }

    public function recordNotificationOpen(string $campaignId): bool
    {
        if (! $this->featureAccessService->canAccess(self::FEATURE_KEY)) {
            return false;
        }

        $campaign = RevenueRecoveryCampaign::withoutGlobalScopes()
            ->where('tenant_id', $this->tenantContext->id())
            ->where('id', $campaignId)
            ->where('status', RevenueRecoveryCampaign::STATUS_ACTIVE)
            ->first();

        if (! $campaign) {
            return false;
        }

        $campaign->increment('notifications_opened');

        return true;
    }

    public function processScheduledCampaigns(): int
    {
        $processed = 0;

        $toActivate = RevenueRecoveryCampaign::withoutGlobalScopes()
            ->where('status', RevenueRecoveryCampaign::STATUS_SCHEDULED)
            ->where('starts_at', '<=', now())
            ->where('ends_at', '>', now())
            ->get();

        foreach ($toActivate as $campaign) {
            $campaign->update([
                'status' => RevenueRecoveryCampaign::STATUS_ACTIVE,
                'activated_at' => now(),
            ]);
            if ($campaign->notifications_enabled) {
                $this->dispatchNotification($campaign);
            }
            $processed++;
        }

        $toDeactivate = RevenueRecoveryCampaign::withoutGlobalScopes()
            ->whereIn('status', [
                RevenueRecoveryCampaign::STATUS_ACTIVE,
                RevenueRecoveryCampaign::STATUS_PAUSED,
                RevenueRecoveryCampaign::STATUS_SCHEDULED,
            ])
            ->where('ends_at', '<', now())
            ->get();

        foreach ($toDeactivate as $campaign) {
            $campaign->update(['status' => RevenueRecoveryCampaign::STATUS_DEACTIVATED]);
            $processed++;
        }

        return $processed;
    }

    private function transition(
        string $id,
        array $permissions,
        array $fromStatuses,
        string $toStatus,
    ): RevenueRecoveryCampaign {
        $this->authorizeManage($permissions);
        $this->ensureEnabled();
        $this->assertOwnerRole();

        $campaign = RevenueRecoveryCampaign::findOrFail($id);
        if (! in_array($campaign->status, $fromStatuses, true)) {
            throw ValidationException::withMessages(['status' => ['Invalid status transition.']]);
        }

        $campaign->update(['status' => $toStatus]);

        return $campaign->fresh();
    }

    private function dispatchNotification(RevenueRecoveryCampaign $campaign): void
    {
        $branding = $this->brandingService->getForTenant($campaign->tenant_id);
        DeliverRevenueRecoveryNotificationJob::dispatch(
            $campaign->id,
            $campaign->tenant_id,
            $campaign->notification_title ?: $campaign->name,
            $campaign->notification_message ?: "{$campaign->name} — limited-time savings on selected meals.",
            $branding->restaurant_name ?? 'Our kitchen',
            $campaign->target_audience,
        );
    }

    /**
     * @param  array<string, mixed>  $data
     * @return array<string, mixed>
     */
    private function mapPayload(array $data): array
    {
        return [
            'name' => $data['name'],
            'campaign_type' => $data['campaign_type'],
            'discount_type' => $data['discount_type'],
            'discount_value' => $data['discount_value'],
            'meal_ids' => $data['meal_ids'] ?? [],
            'starts_at' => $data['starts_at'],
            'ends_at' => $data['ends_at'],
            'notifications_enabled' => $data['notifications_enabled'] ?? false,
            'notification_title' => $data['notification_title'] ?? null,
            'notification_message' => $data['notification_message'] ?? null,
            'target_audience' => $data['target_audience'] ?? 'all',
            'redemption_limit' => $data['redemption_limit'] ?? null,
        ];
    }

    /**
     * @param  array<string, mixed>  $data
     */
    private function validatePayload(array $data, ?RevenueRecoveryCampaign $existing = null): void
    {
        $startsAt = $data['starts_at'] ?? $existing?->starts_at;
        $endsAt = $data['ends_at'] ?? $existing?->ends_at;

        if ($startsAt && $endsAt && $endsAt <= $startsAt) {
            throw ValidationException::withMessages(['ends_at' => ['End time must be after start time.']]);
        }

        $mealIds = $data['meal_ids'] ?? $existing?->meal_ids ?? [];
        if ($mealIds === []) {
            throw ValidationException::withMessages(['meal_ids' => ['Select at least one menu item.']]);
        }

        if (($data['discount_type'] ?? $existing?->discount_type) === RevenueRecoveryCampaign::DISCOUNT_PERCENT) {
            $value = (float) ($data['discount_value'] ?? $existing?->discount_value ?? 0);
            if ($value < 1 || $value > 90) {
                throw ValidationException::withMessages(['discount_value' => ['Percent discount must be between 1 and 90.']]);
            }
        }
    }

    private function ensureEnabled(): void
    {
        if (! $this->featureAccessService->canAccess(self::FEATURE_KEY)) {
            abort(403, 'Revenue Recovery is not available on your plan');
        }
    }

    private function authorizeView(array $permissions): void
    {
        if (! $this->permissionService->has($permissions, 'revenue_recovery.view')
            && ! $this->permissionService->has($permissions, 'revenue_recovery.manage')) {
            abort(403, 'Insufficient permissions');
        }
    }

    private function authorizeManage(array $permissions): void
    {
        $this->permissionService->authorize($permissions, 'revenue_recovery.manage');
    }

    private function assertOwnerRole(): void
    {
        if (! in_array($this->tenantContext->user()?->role, ['owner', 'super_admin'], true)) {
            abort(403, 'Only owners can manage revenue recovery campaigns');
        }
    }

    /**
     * @param  array<string, mixed>  $meta
     */
    private function audit(string $action, RevenueRecoveryCampaign $campaign, array $meta = []): void
    {
        $this->auditLogService->log(
            $action,
            $campaign->tenant_id,
            $this->tenantContext->user()?->id,
            'revenue_recovery_campaign',
            $campaign->id,
            array_merge(['name' => $campaign->name, 'status' => $campaign->status], $meta),
        );
    }
}
