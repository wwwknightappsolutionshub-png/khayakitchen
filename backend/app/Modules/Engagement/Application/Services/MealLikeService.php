<?php

namespace App\Modules\Engagement\Application\Services;

use App\Modules\Auth\Domain\Models\Tenant;
use App\Modules\CRM\Domain\Models\Customer;
use App\Modules\Engagement\Domain\Models\MealLike;
use App\Modules\Loyalty\Application\Services\LoyaltyProgramService;
use App\Modules\Menu\Domain\Models\Meal;
use App\Modules\TenantBranding\Application\Services\BrandingService;
use App\Shared\Entitlements\FeatureAccessService;
use App\Shared\Tenancy\TenantContext;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

class MealLikeService
{
    public const FEATURE_KEY = 'menu_likes_refer';

    public function __construct(
        private FeatureAccessService $featureAccessService,
        private TenantContext $tenantContext,
        private LoyaltyProgramService $loyaltyProgramService,
        private BrandingService $brandingService,
    ) {}

    public function assertEnabled(): void
    {
        $tenantId = $this->tenantContext->id();
        if (! $tenantId || ! $this->featureAccessService->canAccess(self::FEATURE_KEY, $tenantId)) {
            abort(403, $this->featureAccessService->unavailableForKitchenMessage(self::FEATURE_KEY));
        }
    }

    public function likeCountsForMeals(array $mealIds): array
    {
        if ($mealIds === []) {
            return [];
        }

        return MealLike::whereIn('meal_id', $mealIds)
            ->select('meal_id', DB::raw('count(*) as likes_count'))
            ->groupBy('meal_id')
            ->pluck('likes_count', 'meal_id')
            ->map(fn ($c) => (int) $c)
            ->all();
    }

    public function toggleLike(string $mealId, ?string $phone, ?string $guestKey): array
    {
        $this->assertEnabled();
        $meal = Meal::findOrFail($mealId);

        $customerId = null;
        if ($phone) {
            $customer = Customer::where('phone', $phone)->first();
            $customerId = $customer?->id;
        }

        if (! $customerId && (! $guestKey || trim($guestKey) === '')) {
            throw ValidationException::withMessages([
                'guest_key' => ['A guest key or customer phone is required to like a meal.'],
            ]);
        }

        $query = MealLike::where('meal_id', $meal->id);
        if ($customerId) {
            $query->where('customer_id', $customerId);
        } else {
            $query->where('guest_key', $guestKey)->whereNull('customer_id');
        }

        $existing = $query->first();
        if ($existing) {
            $existing->delete();
            $liked = false;
        } else {
            MealLike::create([
                'tenant_id' => $this->tenantContext->id(),
                'meal_id' => $meal->id,
                'customer_id' => $customerId,
                'guest_key' => $customerId ? null : $guestKey,
                'created_at' => now(),
            ]);
            $liked = true;
        }

        $count = MealLike::where('meal_id', $meal->id)->count();

        return [
            'meal_id' => $meal->id,
            'liked' => $liked,
            'likes_count' => $count,
        ];
    }

    public function referPayload(string $mealId, ?string $phone = null): array
    {
        $this->assertEnabled();
        $meal = Meal::findOrFail($mealId);
        $tenant = $this->tenantContext->tenant() ?? Tenant::withoutGlobalScopes()->find($this->tenantContext->id());
        $branding = $this->brandingService->getForTenant($this->tenantContext->id());
        $restaurantName = $branding->restaurant_name ?: ($tenant?->name ?? 'our kitchen');
        $slug = $tenant?->slug ?? 'pilot';
        $frontend = rtrim((string) config('app.frontend_url', 'http://localhost:3000'), '/');

        $query = [];
        if ($phone && $this->featureAccessService->canAccess('loyalty_system', $this->tenantContext->id())) {
            $customer = Customer::where('phone', $phone)->first();
            if ($customer) {
                $referral = $this->loyaltyProgramService->ensureReferralToken($customer->id);
                $query['ref'] = $referral->token;
            }
        }

        $menuUrl = $frontend.'/r/'.$slug.'/meal/'.$meal->id;
        if ($query !== []) {
            $menuUrl .= '?'.http_build_query($query);
        }

        $message = 'Hey 👋 , I will like you to try this menu from "'.$restaurantName.'". I think you will really love it.';

        return [
            'meal_id' => $meal->id,
            'name' => $meal->name,
            'description' => $meal->description,
            'price' => (float) $meal->base_price,
            'image_url' => $meal->image_url,
            'restaurant_name' => $restaurantName,
            'message' => $message,
            'menu_url' => $menuUrl,
            'whatsapp_text' => $message."\n\n".$meal->name
                .($meal->description ? "\n".$meal->description : '')
                ."\nPrice: ".$meal->base_price
                ."\nOrder here: ".$menuUrl,
        ];
    }
}
