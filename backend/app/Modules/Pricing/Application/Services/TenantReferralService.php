<?php

namespace App\Modules\Pricing\Application\Services;

use App\Modules\Auth\Domain\Models\Tenant;
use App\Modules\Auth\Domain\Models\User;
use App\Modules\Notifications\Infrastructure\WhatsApp\Contracts\WhatsAppProviderInterface;
use App\Modules\Pricing\Domain\Models\TenantReferralCode;
use App\Modules\Pricing\Domain\Models\TenantReferralLead;
use App\Modules\Pricing\Mail\TenantReferralInviteMail;
use App\Shared\Auth\PermissionService;
use App\Shared\Entitlements\FeatureAccessService;
use App\Shared\Tenancy\TenantContext;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Mail;
use Illuminate\Support\Str;
use Illuminate\Validation\ValidationException;

class TenantReferralService
{
    public const DEFAULT_REWARD_DAYS = 30;

    public const DEFAULT_REFEREE_TRIAL_DAYS = 30;

    public const MONTHLY_INVITE_CAP = 50;

    public function __construct(
        private TenantContext $tenantContext,
        private PermissionService $permissionService,
        private AuditLogService $auditLogService,
        private SubscriptionService $subscriptionService,
        private FeatureAccessService $featureAccessService,
        private WhatsAppProviderInterface $whatsAppProvider,
    ) {}

    /**
     * @return array<string, mixed>
     */
    public function summaryForTenant(array $permissions): array
    {
        $this->assertCanManage($permissions);
        $tenantId = $this->tenantContext->id();
        if (! $tenantId) {
            abort(400, 'Tenant could not be resolved');
        }

        $code = $this->ensureCodeForTenant($tenantId);
        $leads = TenantReferralLead::query()
            ->where('referrer_tenant_id', $tenantId)
            ->orderByDesc('invited_at')
            ->limit(50)
            ->get();

        $invitesSent = TenantReferralLead::query()->where('referrer_tenant_id', $tenantId)->count();
        $successful = TenantReferralLead::query()
            ->where('referrer_tenant_id', $tenantId)
            ->whereIn('status', [TenantReferralLead::STATUS_SIGNED_UP, TenantReferralLead::STATUS_REWARDED])
            ->count();
        $rewarded = TenantReferralLead::query()
            ->where('referrer_tenant_id', $tenantId)
            ->where('status', TenantReferralLead::STATUS_REWARDED)
            ->count();

        $frontend = rtrim((string) config('app.frontend_url', config('app.url')), '/');
        $link = $frontend.'/get-started?ref='.urlencode($code->code);

        return [
            'code' => $code->code,
            'link' => $link,
            'reward_days' => $code->reward_days,
            'referee_trial_days' => $code->referee_trial_days,
            'stats' => [
                'invites_sent' => $invitesSent,
                'successful_referrals' => $successful,
                'days_earned' => $rewarded * (int) $code->reward_days,
            ],
            'invites' => $leads,
            'whatsapp_share_text' => $this->whatsappShareText($link, $code->referee_trial_days),
        ];
    }

    /**
     * @return array{lead: TenantReferralLead, whatsapp_url: string|null}
     */
    public function invite(
        array $permissions,
        string $email,
        string $phone,
        ?string $name = null,
        string $channel = 'email',
    ): array {
        $this->assertCanManage($permissions);
        $tenantId = $this->tenantContext->id();
        if (! $tenantId) {
            abort(400, 'Tenant could not be resolved');
        }

        $email = strtolower(trim($email));
        $phone = trim($phone);
        $name = $name !== null ? trim($name) : null;
        $channel = in_array($channel, ['email', 'whatsapp'], true) ? $channel : 'email';

        if ($email === '' || $phone === '') {
            throw ValidationException::withMessages([
                'email' => ['Email and phone are required to invite a lead.'],
            ]);
        }

        $this->assertMonthlyInviteCap($tenantId);
        $this->assertNotSelfReferral($tenantId, $email, $phone);

        $code = $this->ensureCodeForTenant($tenantId);
        $tenant = Tenant::withoutGlobalScopes()->findOrFail($tenantId);
        $frontend = rtrim((string) config('app.frontend_url', config('app.url')), '/');
        $link = $frontend.'/get-started?ref='.urlencode($code->code);

        $lead = TenantReferralLead::create([
            'referral_code_id' => $code->id,
            'referrer_tenant_id' => $tenantId,
            'prospect_email' => $email,
            'prospect_phone' => $phone,
            'prospect_name' => $name ?: null,
            'channel' => $channel,
            'status' => TenantReferralLead::STATUS_INVITED,
            'invited_at' => now(),
        ]);

        $whatsappUrl = $this->buildWhatsAppUrl($phone, $this->whatsappShareText($link, $code->referee_trial_days));

        if ($channel === 'email' || $channel === 'whatsapp') {
            try {
                Mail::to($email)->send(new TenantReferralInviteMail(
                    $name ?: 'there',
                    $tenant->name,
                    $link,
                    (int) $code->referee_trial_days,
                ));
            } catch (\Throwable $e) {
                report($e);
                Log::warning('tenant_referral.email_failed', ['error' => $e->getMessage(), 'lead_id' => $lead->id]);
            }
        }

        if ($channel === 'whatsapp') {
            try {
                $this->whatsAppProvider->send(
                    $phone,
                    $this->whatsappShareText($link, $code->referee_trial_days),
                    [
                        'kind' => 'tenant_referral_invite',
                        'lead_id' => $lead->id,
                        'tenant_id' => $tenantId,
                    ],
                );
            } catch (\Throwable $e) {
                report($e);
                Log::warning('tenant_referral.whatsapp_failed', ['error' => $e->getMessage(), 'lead_id' => $lead->id]);
            }
        }

        $this->auditLogService->log(
            'tenant_referral.invite_sent',
            $tenantId,
            $this->tenantContext->user()?->id,
            'tenant_referral_lead',
            $lead->id,
            [
                'channel' => $channel,
                'prospect_email' => $email,
                'prospect_phone' => $phone,
            ],
        );

        return [
            'lead' => $lead->fresh(),
            'whatsapp_url' => $whatsappUrl,
            'link' => $link,
        ];
    }

    public function recordClick(string $code): void
    {
        $referral = TenantReferralCode::query()->where('code', strtoupper(trim($code)))->where('active', true)->first();
        if (! $referral) {
            return;
        }

        // Link-only clicks without contact stay as code attribution at signup; optional lead not required.
        $this->auditLogService->log(
            'tenant_referral.link_clicked',
            $referral->tenant_id,
            null,
            'tenant_referral_code',
            $referral->id,
            ['code' => $referral->code],
        );
    }

    /**
     * Apply referee trial + referrer reward after successful signup.
     */
    public function completeSignupAttribution(string $newTenantId, array $signupData): void
    {
        $rawCode = isset($signupData['referral_code']) ? strtoupper(trim((string) $signupData['referral_code'])) : '';
        if ($rawCode === '') {
            return;
        }

        $code = TenantReferralCode::query()->where('code', $rawCode)->where('active', true)->first();
        if (! $code) {
            return;
        }

        if ($code->tenant_id === $newTenantId) {
            return;
        }

        $ownerEmail = strtolower(trim((string) ($signupData['owner_email'] ?? '')));
        $ownerPhone = trim((string) ($signupData['owner_phone'] ?? ''));

        if ($this->isSelfReferralContact($code->tenant_id, $ownerEmail, $ownerPhone)) {
            $this->auditLogService->log(
                'tenant_referral.self_referral_blocked',
                $code->tenant_id,
                null,
                'tenant',
                $newTenantId,
                ['code' => $code->code],
            );

            return;
        }

        $alreadyRewarded = TenantReferralLead::query()
            ->where('referred_tenant_id', $newTenantId)
            ->where('status', TenantReferralLead::STATUS_REWARDED)
            ->exists();
        if ($alreadyRewarded) {
            return;
        }

        $lead = TenantReferralLead::query()
            ->where('referral_code_id', $code->id)
            ->where('referrer_tenant_id', $code->tenant_id)
            ->whereNull('referred_tenant_id')
            ->when($ownerEmail !== '', fn ($q) => $q->where('prospect_email', $ownerEmail))
            ->orderByDesc('invited_at')
            ->first();

        if (! $lead) {
            $lead = TenantReferralLead::create([
                'referral_code_id' => $code->id,
                'referrer_tenant_id' => $code->tenant_id,
                'prospect_email' => $ownerEmail ?: null,
                'prospect_phone' => $ownerPhone ?: null,
                'prospect_name' => $signupData['owner_name'] ?? null,
                'channel' => 'link',
                'status' => TenantReferralLead::STATUS_INVITED,
                'invited_at' => now(),
            ]);
        }

        $lead->update([
            'referred_tenant_id' => $newTenantId,
            'status' => TenantReferralLead::STATUS_SIGNED_UP,
            'signed_up_at' => now(),
            'prospect_email' => $lead->prospect_email ?: ($ownerEmail ?: null),
            'prospect_phone' => $lead->prospect_phone ?: ($ownerPhone ?: null),
        ]);

        $this->subscriptionService->extendFreeAccess(
            $newTenantId,
            (int) $code->referee_trial_days,
            null,
            'Referral signup trial',
            true,
        );

        $this->subscriptionService->extendFreeAccess(
            $code->tenant_id,
            (int) $code->reward_days,
            null,
            'Referral reward for inviting tenant '.$newTenantId,
            false,
        );

        $lead->update([
            'status' => TenantReferralLead::STATUS_REWARDED,
            'rewarded_at' => now(),
        ]);

        $this->auditLogService->log(
            'tenant_referral.rewarded',
            $code->tenant_id,
            null,
            'tenant_referral_lead',
            $lead->id,
            [
                'referred_tenant_id' => $newTenantId,
                'reward_days' => $code->reward_days,
                'referee_trial_days' => $code->referee_trial_days,
            ],
        );

        $this->featureAccessService->clearCache($newTenantId);
        $this->featureAccessService->clearCache($code->tenant_id);
    }

    /**
     * @return array{leads: mixed, meta: array<string, mixed>}
     */
    public function listLeadsForPlatform(
        ?string $status,
        ?string $search,
        ?string $from,
        ?string $to,
        int $page = 1,
        int $perPage = 50,
        ?string $referrerTenantId = null,
        ?string $referrer = null,
    ): array {
        $query = TenantReferralLead::query()
            ->with(['referrerTenant:id,name,slug', 'referredTenant:id,name,slug', 'referralCode:id,code'])
            ->orderByDesc('invited_at');

        if ($status) {
            $query->where('status', $status);
        }
        if ($referrerTenantId) {
            $query->where('referrer_tenant_id', $referrerTenantId);
        }
        if ($referrer) {
            $term = '%'.strtolower(trim($referrer)).'%';
            $query->whereHas('referrerTenant', function ($q) use ($term) {
                $q->whereRaw('LOWER(name) LIKE ?', [$term])
                    ->orWhereRaw('LOWER(slug) LIKE ?', [$term]);
            });
        }
        if ($search) {
            $term = '%'.strtolower(trim($search)).'%';
            $query->where(function ($q) use ($term) {
                $q->whereRaw('LOWER(prospect_email) LIKE ?', [$term])
                    ->orWhere('prospect_phone', 'like', $term);
            });
        }
        if ($from) {
            $query->whereDate('invited_at', '>=', $from);
        }
        if ($to) {
            $query->whereDate('invited_at', '<=', $to);
        }

        $paginator = $query->paginate($perPage, ['*'], 'page', max(1, $page));

        return [
            'leads' => $paginator->items(),
            'meta' => [
                'current_page' => $paginator->currentPage(),
                'last_page' => $paginator->lastPage(),
                'per_page' => $paginator->perPage(),
                'total' => $paginator->total(),
            ],
        ];
    }

    public function ensureCodeForTenant(string $tenantId): TenantReferralCode
    {
        $existing = TenantReferralCode::query()->where('tenant_id', $tenantId)->first();
        if ($existing) {
            return $existing;
        }

        return TenantReferralCode::create([
            'tenant_id' => $tenantId,
            'code' => $this->generateUniqueCode(),
            'owner_type' => 'tenant',
            'reward_days' => self::DEFAULT_REWARD_DAYS,
            'referee_trial_days' => self::DEFAULT_REFEREE_TRIAL_DAYS,
            'active' => true,
        ]);
    }

    private function generateUniqueCode(): string
    {
        do {
            $code = strtoupper(Str::random(8));
        } while (TenantReferralCode::query()->where('code', $code)->exists());

        return $code;
    }

    private function assertCanManage(array $permissions): void
    {
        $role = $this->tenantContext->user()?->role;
        if (! in_array($role, ['owner', 'manager'], true)) {
            abort(403, 'Only owners and managers can manage referrals');
        }
        if (
            ! $this->permissionService->has($permissions, 'settings.manage')
            && ! $this->permissionService->has($permissions, 'staff.manage')
        ) {
            // Managers have staff.manage; owners have settings.manage — either is enough with role check.
            if ($role !== 'owner' && $role !== 'manager') {
                abort(403, 'Insufficient permissions');
            }
        }
    }

    private function assertMonthlyInviteCap(string $tenantId): void
    {
        $count = TenantReferralLead::query()
            ->where('referrer_tenant_id', $tenantId)
            ->where('invited_at', '>=', now()->startOfMonth())
            ->count();

        if ($count >= self::MONTHLY_INVITE_CAP) {
            throw ValidationException::withMessages([
                'email' => ['Monthly invite limit reached. Try again next month.'],
            ]);
        }
    }

    private function assertNotSelfReferral(string $tenantId, string $email, string $phone): void
    {
        if ($this->isSelfReferralContact($tenantId, $email, $phone)) {
            throw ValidationException::withMessages([
                'email' => ['You cannot refer your own restaurant contact.'],
            ]);
        }
    }

    private function isSelfReferralContact(string $tenantId, string $email, string $phone): bool
    {
        $owners = User::withoutGlobalScopes()
            ->where('tenant_id', $tenantId)
            ->whereIn('role', ['owner', 'manager'])
            ->get(['email']);

        foreach ($owners as $owner) {
            if ($email !== '' && strtolower((string) $owner->email) === $email) {
                return true;
            }
        }

        $tenant = Tenant::withoutGlobalScopes()->find($tenantId);
        $metaPhone = data_get($tenant?->signup_metadata, 'owner_phone');
        if ($phone !== '' && $metaPhone && preg_replace('/\D+/', '', $phone) === preg_replace('/\D+/', '', (string) $metaPhone)) {
            return true;
        }

        return false;
    }

    private function whatsappShareText(string $link, int $trialDays): string
    {
        return "Join me on KhayaOS — restaurant Business OS. Sign up here for {$trialDays} days free: {$link}";
    }

    private function buildWhatsAppUrl(string $phone, string $text): string
    {
        $digits = preg_replace('/\D+/', '', $phone) ?: '';

        return 'https://wa.me/'.$digits.'?text='.rawurlencode($text);
    }
}
