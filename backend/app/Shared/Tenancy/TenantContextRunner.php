<?php

namespace App\Shared\Tenancy;

use App\Modules\Auth\Domain\Models\Tenant;
use App\Modules\Auth\Domain\Models\User;

class TenantContextRunner
{
    public function __construct(private TenantContext $tenantContext) {}

    public function runForTenant(string $tenantId, callable $callback): mixed
    {
        $tenant = Tenant::withoutGlobalScopes()->findOrFail($tenantId);

        $previousTenant = $this->tenantContext->tenant();
        $previousTenantId = $this->tenantContext->id();
        $previousUser = $this->tenantContext->user();

        $this->tenantContext->setTenant($tenant);

        try {
            return $callback();
        } finally {
            if ($previousTenant) {
                $this->tenantContext->setTenant($previousTenant);
            } elseif ($previousTenantId) {
                $this->tenantContext->setTenantId($previousTenantId);
            } else {
                $this->tenantContext->setTenant(null);
            }

            $this->tenantContext->setUser($previousUser);
        }
    }

    public function runForOrder(object $order, callable $callback): mixed
    {
        return $this->runForTenant($order->tenant_id, $callback);
    }
}
