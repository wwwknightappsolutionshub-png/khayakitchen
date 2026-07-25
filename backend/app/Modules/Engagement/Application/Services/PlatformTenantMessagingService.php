<?php

namespace App\Modules\Engagement\Application\Services;

use App\Modules\Auth\Domain\Models\Tenant;
use App\Modules\Auth\Domain\Models\User;
use App\Modules\Engagement\Domain\Models\PlatformTenantMessage;
use App\Modules\Engagement\Mail\PlatformToTenantMail;
use App\Modules\NotificationsCampaign\Application\Services\PushNotificationService;
use App\Modules\Pricing\Application\Services\AuditLogService;
use App\Shared\Auth\PlatformRoles;
use App\Shared\Entitlements\FeatureAccessService;
use Illuminate\Support\Facades\Mail;
use Illuminate\Validation\ValidationException;

class PlatformTenantMessagingService
{
    public const FEATURE_PUSH = 'platform_tenant_push';

    public const FEATURE_EMAIL = 'platform_tenant_email';

    public function __construct(
        private FeatureAccessService $featureAccessService,
        private PushNotificationService $pushNotificationService,
        private AuditLogService $auditLogService,
    ) {}

    public function send(User $sender, string $tenantId, string $channel, string $title, string $body): PlatformTenantMessage
    {
        if (! PlatformRoles::isPlatformStaff($sender)) {
            abort(403, 'Platform staff access required');
        }

        if (! in_array($channel, ['push', 'email'], true)) {
            throw ValidationException::withMessages(['channel' => ['Channel must be push or email.']]);
        }

        $featureKey = $channel === 'push' ? self::FEATURE_PUSH : self::FEATURE_EMAIL;
        if (! $this->featureAccessService->canAccess($featureKey, $tenantId)) {
            abort(403, "Feature '{$featureKey}' is not available for this tenant");
        }

        $tenant = Tenant::withoutGlobalScopes()->findOrFail($tenantId);
        $message = PlatformTenantMessage::withoutGlobalScopes()->create([
            'tenant_id' => $tenant->id,
            'sender_user_id' => $sender->id,
            'channel' => $channel,
            'title' => $title,
            'body' => $body,
            'status' => 'queued',
            'created_at' => now(),
        ]);

        try {
            if ($channel === 'email') {
                $this->deliverEmail($tenant, $title, $body);
            } else {
                $this->deliverPush($tenant, $title, $body);
            }

            $message->update([
                'status' => 'sent',
                'sent_at' => now(),
            ]);
        } catch (\Throwable $e) {
            $message->update([
                'status' => 'failed',
                'error_message' => $e->getMessage(),
            ]);
            throw $e;
        }

        $this->auditLogService->log(
            'platform.tenant_message.sent',
            $tenant->id,
            $sender->id,
            'platform_tenant_message',
            $message->id,
            ['channel' => $channel, 'title' => $title],
        );

        return $message->fresh();
    }

    public function listForTenant(string $tenantId, array $permissions)
    {
        return PlatformTenantMessage::where('tenant_id', $tenantId)
            ->orderByDesc('created_at')
            ->limit(100)
            ->get();
    }

    /**
     * System-generated campaign timing tip (inbox only — not a Super Admin push/email).
     *
     * @param  array<string, mixed>  $metadata
     */
    public function createSystemSuggestion(
        string $tenantId,
        string $title,
        string $body,
        array $metadata = [],
        ?\Carbon\CarbonInterface $at = null,
    ): PlatformTenantMessage {
        $at = $at ? \Carbon\Carbon::instance($at)->utc() : now()->utc();

        return PlatformTenantMessage::withoutGlobalScopes()->create([
            'tenant_id' => $tenantId,
            'sender_user_id' => null,
            'channel' => 'suggestion',
            'title' => $title,
            'body' => $body,
            'metadata' => $metadata,
            'status' => 'sent',
            'sent_at' => $at,
            'created_at' => $at,
        ]);
    }

    public function listForPlatform(?string $tenantId = null)
    {
        $query = PlatformTenantMessage::withoutGlobalScopes()->orderByDesc('created_at');
        if ($tenantId) {
            $query->where('tenant_id', $tenantId);
        }

        return $query->limit(200)->get();
    }

    /**
     * Super Admin poke — try push first, fall back to email. Bypasses plan feature gates.
     *
     * @return array{message: PlatformTenantMessage, channel: string}
     */
    public function poke(User $sender, string $tenantId): array
    {
        if (! PlatformRoles::isPlatformStaff($sender)) {
            abort(403, 'Platform staff access required');
        }

        $tenant = Tenant::withoutGlobalScopes()->findOrFail($tenantId);
        $title = '👋 Poke from KhayaOS';
        $body = 'KhayaOS platform wants a quick check-in. Open your admin dashboard when you can.';

        $channel = 'push';
        $message = PlatformTenantMessage::withoutGlobalScopes()->create([
            'tenant_id' => $tenant->id,
            'sender_user_id' => $sender->id,
            'channel' => $channel,
            'title' => $title,
            'body' => $body,
            'status' => 'queued',
            'created_at' => now(),
        ]);

        try {
            try {
                $this->deliverPush($tenant, $title, $body);
            } catch (\Throwable) {
                $channel = 'email';
                $message->update(['channel' => 'email']);
                $this->deliverEmail($tenant, $title, $body);
            }

            $message->update([
                'status' => 'sent',
                'sent_at' => now(),
            ]);
        } catch (\Throwable $e) {
            $message->update([
                'status' => 'failed',
                'error_message' => $e->getMessage(),
            ]);
            throw ValidationException::withMessages([
                'tenant_id' => ['Could not deliver poke (no push tokens or owner email).'],
            ]);
        }

        $this->auditLogService->log(
            'platform.tenant.poked',
            $tenant->id,
            $sender->id,
            'platform_tenant_message',
            $message->id,
            ['channel' => $channel],
        );

        return [
            'message' => $message->fresh(),
            'channel' => $channel,
        ];
    }

    private function deliverEmail(Tenant $tenant, string $title, string $body): void
    {
        $owners = User::withoutGlobalScopes()
            ->where('tenant_id', $tenant->id)
            ->whereIn('role', ['owner', 'manager'])
            ->where('status', 'active')
            ->get();

        if ($owners->isEmpty()) {
            throw ValidationException::withMessages(['tenant_id' => ['No active owner or manager email on this tenant.']]);
        }

        foreach ($owners as $owner) {
            Mail::to($owner->email)->send(new PlatformToTenantMail(
                $owner->name,
                $title,
                $body,
                $tenant->name,
            ));
        }
    }

    private function deliverPush(Tenant $tenant, string $title, string $body): void
    {
        $users = User::withoutGlobalScopes()
            ->where('tenant_id', $tenant->id)
            ->whereIn('role', ['owner', 'manager', 'kitchen', 'staff'])
            ->where('status', 'active')
            ->get();

        $delivered = false;
        foreach ($users as $user) {
            if ($this->pushNotificationService->sendToUser($tenant->id, $user->id, $title, $body, [
                'source' => 'platform',
            ])) {
                $delivered = true;
            }
        }

        if (! $delivered) {
            throw ValidationException::withMessages([
                'channel' => ['No staff device tokens registered for push on this tenant.'],
            ]);
        }
    }
}
