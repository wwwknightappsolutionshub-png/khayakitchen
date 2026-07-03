<?php

namespace App\Shared\Tenancy;

use App\Modules\Auth\Domain\Models\Tenant;
use App\Modules\Auth\Domain\Models\User;

class TenantContext
{
    private ?string $tenantId = null;

    private ?Tenant $tenant = null;

    private ?User $user = null;

    private bool $applyScope = true;

    private bool $impersonating = false;

    public function setTenant(?Tenant $tenant): void
    {
        $this->tenant = $tenant;
        $this->tenantId = $tenant?->id;
    }

    public function setTenantId(?string $tenantId): void
    {
        $this->tenantId = $tenantId;
        $this->tenant = null;
    }

    public function setUser(?User $user): void
    {
        $this->user = $user;
    }

    public function user(): ?User
    {
        return $this->user;
    }

    public function tenant(): ?Tenant
    {
        return $this->tenant;
    }

    public function id(): ?string
    {
        return $this->tenantId;
    }

    public function shouldApplyScope(): bool
    {
        return $this->applyScope && $this->tenantId !== null;
    }

    public function setApplyScope(bool $apply): void
    {
        $this->applyScope = $apply;
    }

    public function setImpersonating(bool $impersonating): void
    {
        $this->impersonating = $impersonating;
    }

    public function clear(): void
    {
        $this->tenantId = null;
        $this->tenant = null;
        $this->user = null;
        $this->applyScope = true;
        $this->impersonating = false;
    }
}
