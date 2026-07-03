<?php

namespace App\Shared\Database\Traits;

use App\Shared\Tenancy\TenantContext;
use Illuminate\Database\Eloquent\Builder;

trait HasTenant
{
    public static function bootHasTenant(): void
    {
        static::creating(function ($model) {
            if (empty($model->tenant_id) && app()->bound(TenantContext::class)) {
                $tenantId = app(TenantContext::class)->id();
                if ($tenantId) {
                    $model->tenant_id = $tenantId;
                }
            }
        });

        static::addGlobalScope('tenant', function (Builder $builder) {
            if (! app()->bound(TenantContext::class)) {
                return;
            }

            $context = app(TenantContext::class);
            if ($context->shouldApplyScope() && $context->id()) {
                $builder->where($builder->getModel()->getTable().'.tenant_id', $context->id());
            }
        });
    }
}
