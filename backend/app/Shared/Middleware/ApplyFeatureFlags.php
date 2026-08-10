<?php

namespace App\Shared\Middleware;

use App\Shared\Entitlements\FeatureAccessService;
use App\Shared\Tenancy\TenantContext;
use App\Shared\Utils\ApiResponse;
use Closure;
use Illuminate\Http\Request;

class ApplyFeatureFlags
{
    public function __construct(
        private FeatureAccessService $featureAccessService,
        private TenantContext $tenantContext,
    ) {}

    public function handle(Request $request, Closure $next, ?string $module = null)
    {
        if ($module && ! $this->featureAccessService->canAccessModule(
            $module,
            $request->attributes->get('tenant')?->id,
            $request->user(),
        )) {
            return ApiResponse::error(
                FeatureAccessService::formatUnavailableForKitchenMessage(
                    FeatureAccessService::humanizeFeatureKey($module),
                ),
                'FEATURE_DISABLED',
                ['module' => $module],
                403,
            );
        }

        $tenantId = $request->attributes->get('tenant')?->id
            ?? $this->tenantContext->id()
            ?? $request->user()?->tenant_id;
        $request->attributes->set('feature_flags', $this->featureAccessService->legacyFlagsForTenant($tenantId));

        return $next($request);
    }
}
