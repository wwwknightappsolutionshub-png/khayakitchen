<?php

namespace App\Modules\TenantBranding\Application\Services;

use App\Modules\Pricing\Application\Services\AuditLogService;
use App\Modules\TenantBranding\Domain\Models\TenantBranding;
use App\Shared\Auth\PermissionService;
use App\Shared\Tenancy\TenantContext;

class BrandingService
{
    public function __construct(
        private TenantContext $tenantContext,
        private PermissionService $permissionService,
        private AuditLogService $auditLogService,
    ) {}

    public function getForTenant(?string $tenantId = null): TenantBranding
    {
        $tenantId = $tenantId ?? $this->tenantContext->id();

        return TenantBranding::withoutGlobalScopes()->firstOrCreate(
            ['tenant_id' => $tenantId],
            [
                'restaurant_name' => 'Khaya Kitchen',
                'primary_color' => '#E07A5F',
                'secondary_color' => '#81B29A',
            ],
        );
    }

    public function update(array $data, array $permissions): TenantBranding
    {
        $this->permissionService->authorize($permissions, 'branding.manage');

        $branding = $this->getForTenant();
        $branding->update($data);

        $this->auditLogService->log(
            'branding.updated',
            $branding->tenant_id,
            $this->tenantContext->user()?->id,
            'tenant_branding',
            $branding->id,
            $data,
        );

        return $branding->fresh();
    }
}
