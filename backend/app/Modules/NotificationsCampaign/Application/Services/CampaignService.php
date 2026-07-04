<?php

namespace App\Modules\NotificationsCampaign\Application\Services;

use App\Modules\NotificationsCampaign\Domain\Models\NotificationCampaign;
use App\Modules\NotificationsCampaign\Jobs\DeliverCampaignJob;
use App\Shared\Auth\PermissionService;
use App\Shared\Entitlements\FeatureAccessService;
use App\Shared\Tenancy\TenantContext;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;
use Illuminate\Validation\ValidationException;

class CampaignService
{
    public const FEATURE_KEY = 'notification_campaigns';

    public function __construct(
        private TenantContext $tenantContext,
        private PermissionService $permissionService,
        private AudienceResolverService $audienceResolver,
        private FeatureAccessService $featureAccessService,
    ) {}

    public function isEnabledForTenant(?string $tenantId = null): bool
    {
        return $this->featureAccessService->canAccess(
            self::FEATURE_KEY,
            $tenantId ?? $this->tenantContext->id(),
            $this->tenantContext->user(),
        );
    }

    public function listCampaigns(array $permissions)
    {
        $this->authorizeView($permissions);
        $this->ensureEnabled();

        return NotificationCampaign::orderByDesc('created_at')->get();
    }

    public function createCampaign(array $data, array $permissions): NotificationCampaign
    {
        $this->authorizeManage($permissions);
        $this->ensureEnabled();
        app(\App\Modules\Pricing\Application\Services\PlanLimitService::class)->assertCampaignLimit();

        $user = $this->tenantContext->user();
        $role = $user?->role;

        if (! in_array($role, ['owner', 'super_admin'], true)) {
            abort(403, 'Only owners can create campaigns');
        }

        $campaign = NotificationCampaign::create([
            'title' => $data['title'],
            'message' => $data['message'],
            'type' => $data['type'],
            'channel' => $data['channel'],
            'status' => 'draft',
            'target_audience' => $data['target_audience'],
            'created_by' => $user?->id,
            'scheduled_at' => $data['scheduled_at'] ?? null,
        ]);

        $this->logActivity('campaign.created', $campaign);

        return $campaign;
    }

    public function sendCampaign(string $id, array $permissions): NotificationCampaign
    {
        $this->authorizeManage($permissions);
        $this->ensureEnabled();

        $user = $this->tenantContext->user();
        if (! in_array($user?->role, ['owner', 'super_admin'], true)) {
            abort(403, 'Only owners can send campaigns');
        }

        $campaign = NotificationCampaign::findOrFail($id);

        if ($campaign->status === 'sent') {
            throw ValidationException::withMessages(['status' => ['Campaign already sent.']]);
        }

        $this->assertRateLimit($campaign->tenant_id);

        $audience = $this->audienceResolver->resolveOptedInCustomers(
            $campaign->tenant_id,
            $campaign->target_audience,
            $campaign->channel,
        );

        if ($audience->isEmpty()) {
            throw ValidationException::withMessages([
                'audience' => ['No opted-in customers match this audience.'],
            ]);
        }

        $campaign->update(['status' => 'scheduled']);

        DeliverCampaignJob::dispatch($campaign->id, $campaign->tenant_id);

        $this->logActivity('campaign.scheduled', $campaign, [
            'audience_size' => $audience->count(),
        ]);

        return $campaign->fresh();
    }

    private function assertRateLimit(string $tenantId): void
    {
        $sentToday = NotificationCampaign::withoutGlobalScopes()
            ->where('tenant_id', $tenantId)
            ->where('status', 'sent')
            ->where('sent_at', '>=', now()->startOfDay())
            ->count();

        if ($sentToday >= 2) {
            throw ValidationException::withMessages([
                'rate_limit' => ['Maximum 2 campaigns per day allowed for this tenant.'],
            ]);
        }
    }

    private function ensureEnabled(): void
    {
        if (! $this->isEnabledForTenant()) {
            abort(403, 'Campaign notifications are disabled for this tenant');
        }
    }

    private function authorizeView(array $permissions): void
    {
        if (! $this->permissionService->has($permissions, 'campaigns.view')
            && ! $this->permissionService->has($permissions, 'campaigns.manage')) {
            abort(403, 'Insufficient permissions');
        }
    }

    private function authorizeManage(array $permissions): void
    {
        $this->permissionService->authorize($permissions, 'campaigns.manage');
    }

    /**
     * @param  array<string, mixed>  $extra
     */
    public function logActivity(string $action, NotificationCampaign $campaign, array $extra = []): void
    {
        DB::table('activity_logs')->insert([
            'id' => (string) Str::uuid(),
            'tenant_id' => $campaign->tenant_id,
            'user_id' => $this->tenantContext->user()?->id,
            'action' => $action,
            'entity_type' => 'notification_campaign',
            'entity_id' => $campaign->id,
            'metadata' => json_encode(array_merge([
                'title' => $campaign->title,
                'channel' => $campaign->channel,
            ], $extra)),
            'created_at' => now(),
        ]);
    }
}
