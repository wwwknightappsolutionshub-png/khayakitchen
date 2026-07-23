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
