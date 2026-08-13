<?php

namespace App\Modules\Platform\Application\Services;

use App\Modules\Auth\Domain\Models\Tenant;
use App\Modules\Auth\Domain\Models\User;
use App\Modules\Notifications\Application\Services\WhatsAppCredentialResolver;
use App\Modules\Notifications\Infrastructure\WhatsApp\Contracts\WhatsAppProviderInterface;
use App\Modules\Platform\Jobs\ScheduleExistingOwnerOpsPwaNudgesJob;
use App\Modules\Platform\Jobs\SendOpsPwaInstallNudgeJob;
use App\Modules\Platform\Mail\OpsPwaInstallNudgeMail;
use App\Modules\Pricing\Application\Services\AuditLogService;
use App\Modules\TenantBranding\Domain\Models\TenantBranding;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Mail;
use Illuminate\Support\Str;
use Throwable;

class OpsPwaInstallNudgeService
{
    public const WAVE_EXISTING_OWNERS = 'existing_owners_v1';

    public const NEW_OWNER_DELAY_SECONDS = 300;

    public const EXISTING_OWNER_DELAY_SECONDS = 480;

    public function __construct(
        private AuditLogService $auditLogService,
        private WhatsAppProviderInterface $whatsAppProvider,
        private WhatsAppCredentialResolver $whatsAppCredentialResolver,
    ) {}

    public function scheduleForNewOwner(string $ownerId): void
    {
        SendOpsPwaInstallNudgeJob::dispatch($ownerId)
            ->delay(now()->addSeconds(self::NEW_OWNER_DELAY_SECONDS));
    }

    /**
     * Idempotent: one delayed wave per deploy of this feature.
     *
     * @return array{scheduled: bool, delay_seconds: int}
     */
    public function scheduleExistingOwnersWave(): array
    {
        $existing = DB::table('ops_pwa_nudge_waves')
            ->where('wave_key', self::WAVE_EXISTING_OWNERS)
            ->first();

        if ($existing) {
            return ['scheduled' => false, 'delay_seconds' => self::EXISTING_OWNER_DELAY_SECONDS];
        }

        DB::table('ops_pwa_nudge_waves')->insert([
            'id' => (string) Str::uuid(),
            'wave_key' => self::WAVE_EXISTING_OWNERS,
            'scheduled_at' => now(),
            'created_at' => now(),
            'updated_at' => now(),
        ]);

        ScheduleExistingOwnerOpsPwaNudgesJob::dispatch()
            ->delay(now()->addSeconds(self::EXISTING_OWNER_DELAY_SECONDS));

        return ['scheduled' => true, 'delay_seconds' => self::EXISTING_OWNER_DELAY_SECONDS];
    }

    /**
     * @return array{sent: int, skipped: int}
     */
    public function sendExistingOwnersWave(): array
    {
        $wave = DB::table('ops_pwa_nudge_waves')
            ->where('wave_key', self::WAVE_EXISTING_OWNERS)
            ->first();

        if ($wave && $wave->completed_at) {
            return ['sent' => 0, 'skipped' => 0];
        }

        if ($wave) {
            DB::table('ops_pwa_nudge_waves')
                ->where('wave_key', self::WAVE_EXISTING_OWNERS)
                ->update(['started_at' => now(), 'updated_at' => now()]);
        }

        $sent = 0;
        $skipped = 0;
        $owners = User::withoutGlobalScopes()
            ->where('role', 'owner')
            ->whereNotNull('tenant_id')
            ->where('status', 'active')
            ->get();

        foreach ($owners as $owner) {
            if ($this->sendForOwner($owner)) {
                $sent++;
            } else {
                $skipped++;
            }
        }

        if ($wave) {
            DB::table('ops_pwa_nudge_waves')
                ->where('wave_key', self::WAVE_EXISTING_OWNERS)
                ->update([
                    'completed_at' => now(),
                    'owners_targeted' => $sent,
                    'updated_at' => now(),
                ]);
        } else {
            DB::table('ops_pwa_nudge_waves')->insert([
                'id' => (string) Str::uuid(),
                'wave_key' => self::WAVE_EXISTING_OWNERS,
                'scheduled_at' => now(),
                'started_at' => now(),
                'completed_at' => now(),
                'owners_targeted' => $sent,
                'created_at' => now(),
                'updated_at' => now(),
            ]);
        }

        return ['sent' => $sent, 'skipped' => $skipped];
    }

    public function sendForOwnerId(string $ownerId): bool
    {
        $owner = User::withoutGlobalScopes()->find($ownerId);

        return $owner ? $this->sendForOwner($owner) : false;
    }

    public function sendForOwner(User $owner): bool
    {
        if ($owner->role !== 'owner' || ! $owner->tenant_id || $owner->status !== 'active') {
            return false;
        }

        if ($owner->ops_pwa_nudge_sent_at) {
            return false;
        }

        if ($owner->pwa_installed_at) {
            return false;
        }

        $tenantHasOpsPwa = User::withoutGlobalScopes()
            ->where('tenant_id', $owner->tenant_id)
            ->whereNotNull('pwa_installed_at')
            ->exists();
        if ($tenantHasOpsPwa) {
            return false;
        }

        $tenant = Tenant::withoutGlobalScopes()->find($owner->tenant_id);
        if (! $tenant || $tenant->status === 'suspended') {
            return false;
        }

        $branding = TenantBranding::withoutGlobalScopes()
            ->where('tenant_id', $tenant->id)
            ->first();
        $restaurant = $branding?->restaurant_name ?: $tenant->name;
        $loginUrl = $this->opsLoginUrl($owner->email, $tenant->slug);

        try {
            Mail::to($owner->email)->send(new OpsPwaInstallNudgeMail(
                ownerName: $owner->name ?: 'there',
                restaurantName: $restaurant,
                loginUrl: $loginUrl,
            ));
        } catch (Throwable $e) {
            Log::error('ops_pwa_nudge.email_failed', [
                'owner_id' => $owner->id,
                'error' => $e->getMessage(),
            ]);

            return false;
        }

        $this->sendWhatsApp($owner, $tenant, $restaurant, $loginUrl);

        $owner->ops_pwa_nudge_sent_at = now();
        $owner->save();

        $this->auditLogService->log(
            'ops.pwa_nudge.sent',
            $owner->tenant_id,
            $owner->id,
            'user',
            $owner->id,
            ['channel' => 'email_whatsapp'],
        );

        return true;
    }

    private function sendWhatsApp(User $owner, Tenant $tenant, string $restaurant, string $loginUrl): void
    {
        if (app()->runningUnitTests()) {
            return;
        }

        $phone = preg_replace('/\s+/', '', trim((string) data_get($tenant->signup_metadata, 'owner_phone', ''))) ?? '';
        if ($phone === '') {
            return;
        }

        if (! $this->whatsAppCredentialResolver->hasSendableCredentials(null)) {
            Log::warning('ops_pwa_nudge.whatsapp_skipped_no_platform_credentials', [
                'owner_id' => $owner->id,
            ]);

            return;
        }

        $message = "*Install KhayaOS Ops, {$owner->name}*\n\n".
            "*{$restaurant}* runs best from the KhayaOS Ops app on your home screen — not a browser tab.\n\n".
            "*Why install*\n".
            "• One tap from the home screen — no hunting for the login tab mid-service.\n".
            "• Full-screen kitchen workspace, like a native app.\n".
            "• Push alerts when orders arrive or KhayaOS needs you.\n".
            "• Works in Chrome, Safari, and other browsers via Add to Home Screen.\n\n".
            "Open Ops, then tap *Install app* in the menu. Allow the install when your browser asks.\n\n".
            "Open KhayaOS Ops:\n{$loginUrl}";

        try {
            $this->whatsAppProvider->send($phone, $message, [
                'type' => 'ops_pwa_nudge',
                'tenant_id' => null,
                'signup_tenant_id' => $tenant->id,
            ]);
        } catch (Throwable $e) {
            Log::warning('ops_pwa_nudge.whatsapp_failed', [
                'owner_id' => $owner->id,
                'error' => $e->getMessage(),
            ]);
        }
    }

    private function opsLoginUrl(string $email, string $slug): string
    {
        return rtrim((string) config('app.frontend_url', env('FRONTEND_URL', 'http://localhost:3000')), '/').'/ops/login?'.http_build_query([
            'email' => $email,
            'tenant' => $slug,
            'pwa' => '1',
        ]);
    }
}
