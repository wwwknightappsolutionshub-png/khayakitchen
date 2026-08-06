<?php

namespace App\Modules\Platform\Application\Services;

use App\Modules\Auth\Domain\Models\FeatureFlag;
use App\Modules\Auth\Domain\Models\Tenant;
use App\Modules\Auth\Domain\Models\User;
use App\Modules\Pricing\Application\Services\AuditLogService;
use App\Modules\TenantBranding\Domain\Models\RestaurantStatus;
use App\Modules\TenantBranding\Domain\Models\TenantBranding;
use App\Shared\Tenancy\TenantContext;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;
use Illuminate\Validation\ValidationException;

class PlatformTenantService
{
    private const DEFAULT_MODULES = [
        'menu', 'orders', 'inventory', 'crm', 'loyalty', 'dashboard', 'kitchen', 'delivery', 'notifications',
    ];

    public const POKE_COOLDOWN_SECONDS = 300;

    public function __construct(
        private AuditLogService $auditLogService,
        private TenantContext $tenantContext,
        private TenantPresenceService $presenceService,
        private \App\Modules\Engagement\Application\Services\PlatformTenantMessagingService $messagingService,
    ) {}

    public function listTenants(): array
    {
        $stats = $this->presenceService->statsByTenantId();

        return Tenant::query()
            ->orderBy('name')
            ->get()
            ->map(fn (Tenant $tenant) => $this->formatTenant($tenant, $stats))
            ->values()
            ->all();
    }

    public function createTenant(array $data): array
    {
        return DB::transaction(function () use ($data) {
            if (Tenant::where('slug', $data['slug'])->exists()) {
                throw ValidationException::withMessages(['slug' => ['Slug already taken.']]);
            }

            $tenantId = (string) Str::uuid();
            $tenant = Tenant::create([
                'id' => $tenantId,
                'tenant_id' => $tenantId,
                'name' => $data['name'],
                'slug' => $data['slug'],
                'logo_url' => $data['logo_url'] ?? null,
                'primary_color' => $data['primary_color'] ?? '#1a1a2e',
                'status' => 'active',
            ]);

            foreach (self::DEFAULT_MODULES as $module) {
                FeatureFlag::create([
                    'tenant_id' => $tenant->id,
                    'module' => $module,
                    'enabled' => true,
                ]);
            }

            FeatureFlag::create([
                'tenant_id' => $tenant->id,
                'module' => 'notifications.whatsapp',
                'enabled' => true,
            ]);

            TenantBranding::create([
                'tenant_id' => $tenant->id,
                'restaurant_name' => $data['name'],
                'tagline' => 'Welcome',
                'primary_color' => $data['primary_color'] ?? '#1a1a2e',
                'secondary_color' => '#e94560',
            ]);

            RestaurantStatus::create([
                'tenant_id' => $tenant->id,
                'status' => 'open',
                'is_accepting_orders' => true,
                'promo_alerts_enabled' => false,
            ]);

            if (! empty($data['owner_email'])) {
                User::create([
                    'tenant_id' => $tenant->id,
                    'name' => $data['owner_name'] ?? 'Owner',
                    'email' => $data['owner_email'],
                    'password' => $data['owner_password'] ?? 'password',
                    'role' => 'owner',
                    'status' => 'active',
                    'email_verified_at' => array_key_exists('owner_email_verified_at', $data)
                        ? $data['owner_email_verified_at']
                        : now(),
                ]);
            }

            $this->auditLogService->log(
                'tenant.created',
                $tenant->id,
                $this->tenantContext->user()?->id,
                'tenant',
                $tenant->id,
                ['name' => $tenant->name, 'slug' => $tenant->slug],
            );

            return $this->formatTenant($tenant);
        });
    }

    public function updateTenant(string $tenantId, array $data): array
    {
        $tenant = Tenant::findOrFail($tenantId);
        $tenant->update(array_filter([
            'name' => $data['name'] ?? null,
            'slug' => $data['slug'] ?? null,
            'logo_url' => $data['logo_url'] ?? null,
            'primary_color' => $data['primary_color'] ?? null,
            'status' => $data['status'] ?? null,
        ], fn ($v) => $v !== null));

        $this->auditLogService->log(
            'tenant.updated',
            $tenant->id,
            $this->tenantContext->user()?->id,
            'tenant',
            $tenant->id,
            $data,
        );

        return $this->formatTenant($tenant->fresh());
    }

    public function deleteTenant(string $tenantId): void
    {
        $tenant = Tenant::findOrFail($tenantId);
        $tenant->update(['status' => 'suspended']);

        $this->auditLogService->log(
            'tenant.suspended',
            $tenant->id,
            $this->tenantContext->user()?->id,
            'tenant',
            $tenant->id,
            [],
        );
    }

    /**
     * Permanently remove a kitchen and all tenant-scoped data.
     *
     * @param  array{confirmation_slug?: string, confirm?: bool}  $data
     * @return array{purged: bool, tenant_id: string, slug: string}
     */
    public function purgeTenant(string $tenantId, array $data): array
    {
        $tenant = Tenant::withoutGlobalScopes()->findOrFail($tenantId);
        $confirmationSlug = strtolower(trim((string) ($data['confirmation_slug'] ?? '')));
        $confirmed = filter_var($data['confirm'] ?? false, FILTER_VALIDATE_BOOLEAN);

        if (! $confirmed) {
            throw ValidationException::withMessages([
                'confirm' => ['Set confirm=true to permanently delete this kitchen.'],
            ]);
        }

        if ($confirmationSlug === '' || $confirmationSlug !== strtolower((string) $tenant->slug)) {
            throw ValidationException::withMessages([
                'confirmation_slug' => ['Type the exact kitchen slug to confirm permanent deletion.'],
            ]);
        }

        $actorId = $this->tenantContext->user()?->id;
        $slug = $tenant->slug;
        $name = $tenant->name;

        $this->auditLogService->log(
            'tenant.purge_requested',
            $tenant->id,
            $actorId,
            'tenant',
            $tenant->id,
            ['slug' => $slug, 'name' => $name],
        );

        DB::transaction(function () use ($tenant) {
            $this->wipeTenantData($tenant->id);
            Tenant::withoutGlobalScopes()->where('id', $tenant->id)->delete();
        });

        $this->auditLogService->log(
            'tenant.purged',
            null,
            $actorId,
            'tenant',
            $tenantId,
            ['slug' => $slug, 'name' => $name],
        );

        return [
            'purged' => true,
            'tenant_id' => $tenantId,
            'slug' => $slug,
        ];
    }

    private function wipeTenantData(string $tenantId): void
    {
        // Dependency-sensitive deletes first (restrict FKs / children).
        $orderedDeletes = [
            'order_item_options',
            'order_items',
            'payments',
            'order_status_events',
            'delivery_orders',
            'orders',
            'meal_likes',
            'meal_options',
            'option_groups',
            'recipe_components',
            'recipe_definitions',
            'inventory_transactions',
            'inventory_items',
            'meals',
            'platform_tenant_messages',
            'kitchen_reviews',
            'customer_notification_preferences',
            'customer_email_otps',
            'customer_sessions',
            'customer_locations',
            'customer_addresses',
            'customer_custom_meal_requests',
            'proximity_offer_events',
            'loyalty_transactions',
            'loyalty_progress',
            'loyalty_referrals',
            'loyalty_packages',
            'loyalty_settings',
            'crm_interactions',
            'crm_notes',
            'customers',
            'notification_campaigns',
            'notifications',
            'device_tokens',
            'delivery_zones',
            'seasonal_promos',
            'revenue_recovery_campaigns',
            'tenant_revenue_recovery_settings',
            'tenant_sales_rhythm_summaries',
            'tenant_trial_reminders',
            'tenant_referral_leads',
            'tenant_referral_codes',
            'upgrade_requests',
            'subscription_history',
            'tenant_entitlement_overrides',
            'tenant_subscriptions',
            'feature_flags',
            'restaurant_statuses',
            'tenant_brandings',
            'tenant_whatsapp_settings',
            'activity_logs',
            'domain_event_logs',
            'audit_logs',
        ];

        foreach ($orderedDeletes as $table) {
            $this->deleteByTenantId($table, $tenantId);
        }

        // Chat messages may only have thread_id — already handled if cascade; safe no-op if missing.
        if (\Illuminate\Support\Facades\Schema::hasTable('chat_threads')
            && \Illuminate\Support\Facades\Schema::hasColumn('chat_threads', 'tenant_id')
        ) {
            $threadIds = DB::table('chat_threads')->where('tenant_id', $tenantId)->pluck('id');
            if ($threadIds->isNotEmpty() && \Illuminate\Support\Facades\Schema::hasTable('chat_messages')) {
                DB::table('chat_messages')->whereIn('thread_id', $threadIds)->delete();
            }
            DB::table('chat_threads')->where('tenant_id', $tenantId)->delete();
        }

        // Free global emails: delete Sanctum tokens then users for this tenant.
        $userIds = User::withoutGlobalScopes()->where('tenant_id', $tenantId)->pluck('id');
        if ($userIds->isNotEmpty()) {
            if (\Illuminate\Support\Facades\Schema::hasTable('personal_access_tokens')) {
                DB::table('personal_access_tokens')
                    ->where('tokenable_type', User::class)
                    ->whereIn('tokenable_id', $userIds)
                    ->delete();
            }
            if (\Illuminate\Support\Facades\Schema::hasTable('email_verification_tokens')) {
                DB::table('email_verification_tokens')->whereIn('user_id', $userIds)->delete();
            }
            User::withoutGlobalScopes()->where('tenant_id', $tenantId)->delete();
        }

        // Branding uploads on public disk.
        try {
            \Illuminate\Support\Facades\Storage::disk('public')->deleteDirectory("branding/{$tenantId}");
        } catch (\Throwable) {
            // best-effort
        }
    }

    private function deleteByTenantId(string $table, string $tenantId): void
    {
        if (! \Illuminate\Support\Facades\Schema::hasTable($table)) {
            return;
        }
        if (! \Illuminate\Support\Facades\Schema::hasColumn($table, 'tenant_id')) {
            return;
        }

        DB::table($table)->where('tenant_id', $tenantId)->delete();
    }

    /**
     * One-tap nudge to tenant staff (push, email fallback). Rate-limited.
     *
     * @return array{message: mixed, channel: string}
     */
    public function poke(User $sender, string $tenantId): array
    {
        $tenant = Tenant::withoutGlobalScopes()->findOrFail($tenantId);

        if ($tenant->last_poked_at && $tenant->last_poked_at->gt(now()->subSeconds(self::POKE_COOLDOWN_SECONDS))) {
            $wait = self::POKE_COOLDOWN_SECONDS - $tenant->last_poked_at->diffInSeconds(now());
            throw ValidationException::withMessages([
                'tenant_id' => ["Please wait {$wait}s before poking this tenant again."],
            ]);
        }

        $result = $this->messagingService->poke($sender, $tenantId);

        $tenant->last_poked_at = now();
        $tenant->save();

        return $result;
    }

    /**
     * @param  array<string, object>  $statsByTenant
     */
    private function formatTenant(Tenant $tenant, array $statsByTenant = []): array
    {
        return array_merge([
            'id' => $tenant->id,
            'name' => $tenant->name,
            'slug' => $tenant->slug,
            'status' => $tenant->status,
            'logo_url' => $tenant->logo_url,
            'primary_color' => $tenant->primary_color,
            'created_at' => $tenant->created_at?->toIso8601String(),
        ], $this->presenceService->formatPresenceFields(
            $tenant->id,
            $statsByTenant,
            $tenant->last_poked_at,
        ));
    }
}
