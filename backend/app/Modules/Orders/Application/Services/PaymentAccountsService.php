<?php

namespace App\Modules\Orders\Application\Services;

use App\Modules\CRM\Domain\Models\Customer;
use App\Modules\Orders\Domain\Models\Order;
use App\Modules\Orders\Domain\Models\Payment;
use App\Modules\Pricing\Application\Services\AuditLogService;
use App\Shared\Auth\PermissionService;
use App\Shared\Entitlements\FeatureAccessService;
use App\Shared\Tenancy\TenantContext;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\Storage;
use Illuminate\Validation\ValidationException;

class PaymentAccountsService
{
    public const PROOF_WAIT_SECONDS = 120;

    public const PROOF_MAX_KB = 2048;

    public function __construct(
        private TenantContext $tenantContext,
        private PermissionService $permissionService,
        private FeatureAccessService $featureAccessService,
        private AuditLogService $auditLogService,
    ) {}

    /**
     * @return Collection<int, array<string, mixed>>
     */
    public function listAccounts(array $permissions): Collection
    {
        $this->permissionService->authorize($permissions, 'orders.view');
        $this->featureAccessService->assertAccess('orders');

        $orders = Order::query()
            ->with(['items.meal', 'customer', 'payments'])
            ->whereHas('payments', fn ($q) => $q->where('provider', 'transfer'))
            ->orderByDesc('created_at')
            ->limit(200)
            ->get();

        return $orders->map(fn (Order $order) => $this->serializeAccountRow($order));
    }

    /**
     * @return array<string, mixed>
     */
    public function uploadProof(string $orderId, string $phone, UploadedFile $file): array
    {
        $this->featureAccessService->assertAccess('orders');

        $customer = Customer::where('phone', $phone)->firstOrFail();
        $order = Order::where('customer_id', $customer->id)
            ->where('id', $orderId)
            ->with('payments')
            ->firstOrFail();

        $payment = $this->latestTransferPayment($order);
        if (! $payment) {
            throw ValidationException::withMessages([
                'payment' => ['This order is not a bank transfer payment.'],
            ]);
        }

        if ($payment->status === 'paid' || $payment->verified_at) {
            throw ValidationException::withMessages([
                'payment' => ['This payment has already been verified.'],
            ]);
        }

        if ($payment->proof_path) {
            throw ValidationException::withMessages([
                'proof' => ['A payment proof has already been uploaded for this order.'],
            ]);
        }

        $waitStarted = $payment->proof_wait_started_at ?? $payment->created_at ?? now();
        $elapsed = (int) floor($waitStarted->diffInSeconds(now()));
        if ($elapsed < self::PROOF_WAIT_SECONDS) {
            $remaining = self::PROOF_WAIT_SECONDS - $elapsed;
            throw ValidationException::withMessages([
                'proof' => ["Please wait {$remaining} more seconds before uploading proof."],
            ]);
        }

        $tenantId = $order->tenant_id;
        $path = $file->store("payment-proofs/{$tenantId}/{$order->id}", 'public');

        $payment->update([
            'proof_path' => $path,
            'proof_mime' => $file->getMimeType(),
            'proof_original_name' => $file->getClientOriginalName(),
            'proof_size' => $file->getSize(),
            'proof_uploaded_at' => now(),
            'status' => 'pending',
        ]);

        $this->auditLogService->log(
            'payment.proof_uploaded',
            $tenantId,
            null,
            'payment',
            $payment->id,
            [
                'order_id' => $order->id,
                'proof_mime' => $payment->proof_mime,
                'proof_size' => $payment->proof_size,
            ],
        );

        return $this->serializePaymentForCustomer($payment->fresh());
    }

    /**
     * @return array<string, mixed>
     */
    public function verifyPayment(string $orderId, array $permissions): array
    {
        if (
            ! $this->permissionService->has($permissions, 'orders.update')
            && ! $this->permissionService->has($permissions, 'orders.update_status')
        ) {
            abort(403, 'Insufficient permissions');
        }

        $this->featureAccessService->assertAccess('orders');

        $order = Order::query()->with('payments')->findOrFail($orderId);
        $payment = $this->latestTransferPayment($order);

        if (! $payment) {
            throw ValidationException::withMessages([
                'payment' => ['This order is not a bank transfer payment.'],
            ]);
        }

        if (! $payment->proof_path) {
            throw ValidationException::withMessages([
                'payment' => ['Payment proof has not been uploaded yet.'],
            ]);
        }

        if ($payment->status === 'paid' && $payment->verified_at) {
            return $this->serializeAccountRow($order->fresh(['items.meal', 'customer', 'payments']));
        }

        $actorId = $this->tenantContext->user()?->id ?? auth('sanctum')->user()?->id;

        $payment->update([
            'status' => 'paid',
            'verified_at' => now(),
            'verified_by' => $actorId,
        ]);

        $this->auditLogService->log(
            'payment.verified',
            $order->tenant_id,
            $actorId,
            'payment',
            $payment->id,
            ['order_id' => $order->id],
        );

        return $this->serializeAccountRow($order->fresh(['items.meal', 'customer', 'payments']));
    }

    public function assertTransferAcceptable(Order $order): void
    {
        $payment = $this->latestTransferPayment($order->loadMissing('payments'));
        if (! $payment) {
            return;
        }

        if ($payment->status !== 'paid' || ! $payment->verified_at || ! $payment->proof_path) {
            throw ValidationException::withMessages([
                'status' => ['Bank transfer payment must be verified in Accounts before this order can be accepted.'],
            ]);
        }
    }

    public function enrichOrderPaymentAttributes(Order $order): Order
    {
        $latest = $order->payments
            ->sortByDesc(fn ($payment) => $payment->created_at?->timestamp ?? 0)
            ->first();

        $order->setAttribute('payment_channel', $latest?->provider);
        $order->setAttribute('payment_status', $latest?->status);
        $order->setAttribute('payment_verified', (bool) ($latest?->verified_at));
        $order->setAttribute('payment_proof_uploaded', (bool) ($latest?->proof_path));
        $order->setAttribute(
            'payment_awaiting_verification',
            $latest?->provider === 'transfer'
                && $latest?->status !== 'paid'
                && (bool) $latest?->proof_path,
        );
        $order->setAttribute(
            'payment_accept_blocked',
            $latest?->provider === 'transfer'
                && (! $latest?->verified_at || $latest?->status !== 'paid'),
        );

        if ($latest?->provider === 'transfer') {
            $order->setAttribute('payment', $this->serializePaymentForCustomer($latest));
        }

        return $order;
    }

    private function latestTransferPayment(Order $order): ?Payment
    {
        return $order->payments
            ->where('provider', 'transfer')
            ->sortByDesc(fn ($payment) => $payment->created_at?->timestamp ?? 0)
            ->first();
    }

    /**
     * @return array<string, mixed>
     */
    private function serializeAccountRow(Order $order): array
    {
        $payment = $order->payments
            ->sortByDesc(fn ($p) => $p->created_at?->timestamp ?? 0)
            ->first();

        $meals = $order->items->map(function ($item) {
            return [
                'name' => $item->meal?->name ?? 'Meal',
                'quantity' => (int) $item->quantity,
                'line_total' => (float) $item->final_price,
            ];
        })->values()->all();

        return [
            'order_id' => $order->id,
            'order_no' => strtoupper(substr(str_replace('-', '', $order->id), 0, 8)),
            'status' => $order->status,
            'customer_name' => $order->customer?->name,
            'customer_phone' => $order->customer?->phone,
            'meals' => $meals,
            'total_amount' => (float) $order->total_amount,
            'ordered_at' => $order->created_at?->toIso8601String(),
            'payment_channel' => $payment?->provider,
            'payment_status' => $payment?->status,
            'payment_verified' => (bool) ($payment?->verified_at),
            'verified_at' => $payment?->verified_at?->toIso8601String(),
            'attachment' => $payment?->proof_path ? [
                'url' => Storage::disk('public')->url($payment->proof_path),
                'mime' => $payment->proof_mime,
                'name' => $payment->proof_original_name,
                'size' => $payment->proof_size,
                'uploaded_at' => $payment->proof_uploaded_at?->toIso8601String(),
            ] : null,
            'orders_path' => '/ops/orders',
        ];
    }

    /**
     * @return array<string, mixed>
     */
    public function serializePaymentForCustomer(Payment $payment): array
    {
        $waitStarted = $payment->proof_wait_started_at ?? $payment->created_at;
        $elapsed = $waitStarted ? (int) floor($waitStarted->diffInSeconds(now())) : 0;
        $remaining = max(0, self::PROOF_WAIT_SECONDS - $elapsed);

        return [
            'id' => $payment->id,
            'provider' => $payment->provider,
            'status' => $payment->status,
            'amount' => (float) $payment->amount,
            'proof_uploaded' => (bool) $payment->proof_path,
            'proof_uploaded_at' => $payment->proof_uploaded_at?->toIso8601String(),
            'verified' => (bool) $payment->verified_at,
            'verified_at' => $payment->verified_at?->toIso8601String(),
            'wait_seconds' => self::PROOF_WAIT_SECONDS,
            'wait_remaining_seconds' => $remaining,
            'can_upload_proof' => $remaining === 0
                && ! $payment->proof_path
                && $payment->provider === 'transfer'
                && $payment->status !== 'paid',
            'proof_url' => $payment->proof_path
                ? Storage::disk('public')->url($payment->proof_path)
                : null,
        ];
    }
}
