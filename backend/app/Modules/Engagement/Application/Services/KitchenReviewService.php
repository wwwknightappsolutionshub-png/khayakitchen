<?php

namespace App\Modules\Engagement\Application\Services;

use App\Modules\CRM\Domain\Models\Customer;
use App\Modules\Engagement\Domain\Models\KitchenReview;
use App\Shared\Auth\PermissionService;
use App\Shared\Entitlements\FeatureAccessService;
use App\Shared\Tenancy\TenantContext;
use Illuminate\Support\Collection;
use Illuminate\Validation\ValidationException;

class KitchenReviewService
{
    public const FEATURE_KEY = 'kitchen_reviews';

    public const MAX_WORDS = 200;

    public const MAX_SENTENCES = 5;

    public function __construct(
        private FeatureAccessService $featureAccessService,
        private TenantContext $tenantContext,
        private PermissionService $permissionService,
    ) {}

    public function assertEnabled(?string $tenantId = null): void
    {
        $tenantId = $tenantId ?? $this->tenantContext->id();
        if (! $tenantId || ! $this->featureAccessService->canAccess(self::FEATURE_KEY, $tenantId)) {
            abort(403, "Feature '".self::FEATURE_KEY."' is not available on your plan");
        }
    }

    public function submit(string $name, string $phone, string $body): KitchenReview
    {
        $this->assertEnabled();
        $summary = $this->summarize($body);

        $customer = Customer::where('phone', $phone)->first();
        if (! $customer) {
            $customer = Customer::create([
                'tenant_id' => $this->tenantContext->id(),
                'name' => $name,
                'phone' => $phone,
            ]);
        } elseif ($name && $customer->name === 'Guest') {
            $customer->update(['name' => $name]);
        }

        return KitchenReview::create([
            'tenant_id' => $this->tenantContext->id(),
            'customer_id' => $customer->id,
            'customer_name' => $name ?: $customer->name,
            'customer_phone' => $phone,
            'body' => trim($body),
            'summary' => $summary,
            'status' => 'pending',
        ]);
    }

    public function listForOwner(array $permissions, ?string $status = null): Collection
    {
        $this->permissionService->authorize($permissions, 'dashboard.view');
        $this->assertEnabled();

        $query = KitchenReview::orderByDesc('created_at');
        if ($status) {
            $query->where('status', $status);
        }

        return $query->get();
    }

    public function pendingCount(): int
    {
        if (! $this->featureAccessService->canAccess(self::FEATURE_KEY)) {
            return 0;
        }

        return KitchenReview::where('status', 'pending')->count();
    }

    public function moderate(string $id, string $status, array $permissions): KitchenReview
    {
        $this->permissionService->authorize($permissions, 'settings.manage');
        $this->assertEnabled();

        if (! in_array($status, ['approved', 'rejected'], true)) {
            throw ValidationException::withMessages(['status' => ['Status must be approved or rejected.']]);
        }

        $review = KitchenReview::findOrFail($id);
        $review->update([
            'status' => $status,
            'moderated_by' => $this->tenantContext->user()?->id,
            'moderated_at' => now(),
            'summary' => $this->summarize($review->body),
        ]);

        return $review->fresh();
    }

    /** @return list<array{customer_name: string, summary: string}> */
    public function approvedTickerItems(?string $tenantId = null): array
    {
        $tenantId = $tenantId ?? $this->tenantContext->id();
        if (! $tenantId || ! $this->featureAccessService->canAccess(self::FEATURE_KEY, $tenantId)) {
            return [];
        }

        return KitchenReview::withoutGlobalScopes()
            ->where('tenant_id', $tenantId)
            ->where('status', 'approved')
            ->orderByDesc('moderated_at')
            ->limit(20)
            ->get()
            ->map(fn (KitchenReview $review) => [
                'customer_name' => $review->customer_name,
                'summary' => $review->summary ?: $this->summarize($review->body),
            ])
            ->all();
    }

    public function summarize(string $body): string
    {
        $body = trim(preg_replace('/\s+/u', ' ', $body) ?? '');
        if ($body === '') {
            throw ValidationException::withMessages(['body' => ['Review text is required.']]);
        }

        $sentences = preg_split('/(?<=[.!?])\s+/u', $body, -1, PREG_SPLIT_NO_EMPTY) ?: [$body];
        $sentences = array_slice($sentences, 0, self::MAX_SENTENCES);
        $summary = implode(' ', $sentences);

        $words = preg_split('/\s+/u', $summary, -1, PREG_SPLIT_NO_EMPTY) ?: [];
        if (count($words) > self::MAX_WORDS) {
            $summary = implode(' ', array_slice($words, 0, self::MAX_WORDS));
        }

        $fullWords = preg_split('/\s+/u', $body, -1, PREG_SPLIT_NO_EMPTY) ?: [];
        if (count($fullWords) > self::MAX_WORDS) {
            throw ValidationException::withMessages([
                'body' => ['Review must not exceed '.self::MAX_WORDS.' words.'],
            ]);
        }

        $fullSentences = preg_split('/(?<=[.!?])\s+/u', $body, -1, PREG_SPLIT_NO_EMPTY) ?: [$body];
        if (count($fullSentences) > self::MAX_SENTENCES) {
            throw ValidationException::withMessages([
                'body' => ['Review must not exceed '.self::MAX_SENTENCES.' sentences.'],
            ]);
        }

        return $summary;
    }
}
