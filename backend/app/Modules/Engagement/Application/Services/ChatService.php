<?php

namespace App\Modules\Engagement\Application\Services;

use App\Modules\Auth\Domain\Models\User;
use App\Modules\CRM\Domain\Models\Customer;
use App\Modules\Engagement\Domain\Models\ChatMessage;
use App\Modules\Engagement\Domain\Models\ChatThread;
use App\Modules\NotificationsCampaign\Application\Services\PushNotificationService;
use App\Modules\Pricing\Application\Services\AuditLogService;
use App\Shared\Auth\PermissionService;
use App\Shared\Auth\PlatformRoles;
use App\Shared\Entitlements\FeatureAccessService;
use App\Shared\Tenancy\TenantContext;
use Illuminate\Support\Collection;
use Illuminate\Validation\ValidationException;

class ChatService
{
    public const FEATURE_PLATFORM_TENANT = 'platform_tenant_chat';

    public const FEATURE_TENANT_CUSTOMER = 'tenant_customer_chat';

    public function __construct(
        private FeatureAccessService $featureAccessService,
        private PermissionService $permissionService,
        private TenantContext $tenantContext,
        private PushNotificationService $pushNotificationService,
        private AuditLogService $auditLogService,
    ) {}

    public function listPlatformThreads(?string $tenantId = null): Collection
    {
        $query = ChatThread::withoutGlobalScopes()
            ->where('type', 'platform_tenant')
            ->orderByDesc('updated_at');

        if ($tenantId) {
            $query->where('tenant_id', $tenantId);
        }

        return $query->with(['messages' => fn ($q) => $q->orderByDesc('created_at')->limit(1)])->get();
    }

    public function listTenantPlatformThreads(array $permissions): Collection
    {
        $this->permissionService->authorize($permissions, 'settings.manage');
        $this->assertTenantFeature(self::FEATURE_PLATFORM_TENANT);

        return ChatThread::where('type', 'platform_tenant')
            ->orderByDesc('updated_at')
            ->with(['messages' => fn ($q) => $q->orderByDesc('created_at')->limit(1)])
            ->get();
    }

    public function listTenantCustomerThreads(array $permissions): Collection
    {
        $this->permissionService->authorize($permissions, 'crm.view');
        $this->assertTenantFeature(self::FEATURE_TENANT_CUSTOMER);

        return ChatThread::where('type', 'tenant_customer')
            ->orderByDesc('updated_at')
            ->with(['messages' => fn ($q) => $q->orderByDesc('created_at')->limit(1)])
            ->get();
    }

    public function openPlatformTenantThread(User $platformUser, string $tenantId, ?string $subject = null): ChatThread
    {
        if (! PlatformRoles::isPlatformStaff($platformUser)) {
            abort(403, 'Platform staff access required');
        }

        if (! $this->featureAccessService->canAccess(self::FEATURE_PLATFORM_TENANT, $tenantId)) {
            abort(403, "Feature '".self::FEATURE_PLATFORM_TENANT."' is not available for this tenant");
        }

        $thread = ChatThread::withoutGlobalScopes()
            ->where('type', 'platform_tenant')
            ->where('tenant_id', $tenantId)
            ->orderByDesc('updated_at')
            ->first();

        if (! $thread) {
            $thread = ChatThread::withoutGlobalScopes()->create([
                'type' => 'platform_tenant',
                'tenant_id' => $tenantId,
                'subject' => $subject ?: 'Platform support',
                'created_by_user_id' => $platformUser->id,
            ]);
        }

        return $thread;
    }

    public function openTenantCustomerThread(array $permissions, string $customerId, ?string $subject = null): ChatThread
    {
        $this->permissionService->authorize($permissions, 'crm.manage');
        $this->assertTenantFeature(self::FEATURE_TENANT_CUSTOMER);

        $customer = Customer::findOrFail($customerId);
        $user = $this->tenantContext->user();

        $thread = ChatThread::where('type', 'tenant_customer')
            ->where('customer_id', $customer->id)
            ->orderByDesc('updated_at')
            ->first();

        if (! $thread) {
            $thread = ChatThread::create([
                'type' => 'tenant_customer',
                'tenant_id' => $this->tenantContext->id(),
                'subject' => $subject ?: ('Chat with '.$customer->name),
                'created_by_user_id' => $user?->id,
                'customer_id' => $customer->id,
            ]);
        }

        return $thread;
    }

    public function openCustomerThread(?string $phone, string $name, ?string $subject = null, ?string $guestKey = null): ChatThread
    {
        $this->assertTenantFeature(self::FEATURE_TENANT_CUSTOMER);

        $customer = $this->resolveCustomerForChat($phone, $name, $guestKey);

        $thread = ChatThread::where('type', 'tenant_customer')
            ->where('customer_id', $customer->id)
            ->orderByDesc('updated_at')
            ->first();

        if (! $thread) {
            $thread = ChatThread::create([
                'type' => 'tenant_customer',
                'tenant_id' => $this->tenantContext->id(),
                'subject' => $subject ?: 'Customer support',
                'customer_id' => $customer->id,
            ]);
        }

        return $thread->load('messages');
    }

    public function messagesForPlatform(string $threadId): ChatThread
    {
        $thread = ChatThread::withoutGlobalScopes()->with('messages')->findOrFail($threadId);
        if ($thread->type !== 'platform_tenant') {
            abort(404);
        }

        return $thread;
    }

    public function messagesForTenant(string $threadId, array $permissions): ChatThread
    {
        $thread = ChatThread::with('messages')->findOrFail($threadId);

        if ($thread->type === 'platform_tenant') {
            $this->permissionService->authorize($permissions, 'settings.manage');
            $this->assertTenantFeature(self::FEATURE_PLATFORM_TENANT);
        } else {
            $this->permissionService->authorize($permissions, 'crm.view');
            $this->assertTenantFeature(self::FEATURE_TENANT_CUSTOMER);
        }

        return $thread;
    }

    public function messagesForCustomer(string $threadId, ?string $phone, ?string $guestKey = null): ChatThread
    {
        $this->assertTenantFeature(self::FEATURE_TENANT_CUSTOMER);
        $customer = $this->findCustomerForChat($phone, $guestKey);
        $thread = ChatThread::with('messages')->findOrFail($threadId);

        if ($thread->type !== 'tenant_customer' || $thread->customer_id !== $customer->id) {
            abort(403, 'Chat access denied');
        }

        return $thread;
    }

    public function postPlatformMessage(User $platformUser, string $threadId, string $body): ChatMessage
    {
        if (! PlatformRoles::isPlatformStaff($platformUser)) {
            abort(403, 'Platform staff access required');
        }

        $thread = ChatThread::withoutGlobalScopes()->findOrFail($threadId);
        if ($thread->type !== 'platform_tenant') {
            abort(404);
        }

        if (! $this->featureAccessService->canAccess(self::FEATURE_PLATFORM_TENANT, $thread->tenant_id)) {
            abort(403, "Feature '".self::FEATURE_PLATFORM_TENANT."' is not available for this tenant");
        }

        $message = $this->createMessage(
            $thread,
            'platform_user',
            $platformUser->id,
            null,
            PlatformRoles::labelForRole($platformUser->role),
            $body,
        );

        $this->notifyTenantUsersOfPlatformChat($thread, $body);

        return $message;
    }

    public function postTenantMessage(string $threadId, string $body, array $permissions): ChatMessage
    {
        $thread = ChatThread::findOrFail($threadId);
        $user = $this->tenantContext->user();

        if ($thread->type === 'platform_tenant') {
            $this->permissionService->authorize($permissions, 'settings.manage');
            $this->assertTenantFeature(self::FEATURE_PLATFORM_TENANT);
            $senderType = 'tenant_user';
        } else {
            $this->permissionService->authorize($permissions, 'crm.manage');
            $this->assertTenantFeature(self::FEATURE_TENANT_CUSTOMER);
            $senderType = 'tenant_user';
        }

        $message = $this->createMessage(
            $thread,
            $senderType,
            $user?->id,
            null,
            $user?->name ?? 'Staff',
            $body,
        );

        if ($thread->type === 'tenant_customer' && $thread->customer_id) {
            $this->pushNotificationService->send(
                $thread->tenant_id,
                $thread->customer_id,
                'New message from restaurant',
                $body,
                ['thread_id' => $thread->id],
            );
        }

        return $message;
    }

    public function postCustomerMessage(string $threadId, ?string $phone, string $body, ?string $guestKey = null): ChatMessage
    {
        $this->assertTenantFeature(self::FEATURE_TENANT_CUSTOMER);
        $customer = $this->findCustomerForChat($phone, $guestKey);
        $thread = ChatThread::findOrFail($threadId);

        if ($thread->type !== 'tenant_customer' || $thread->customer_id !== $customer->id) {
            abort(403, 'Chat access denied');
        }

        return $this->createMessage(
            $thread,
            'customer',
            null,
            $customer->id,
            $customer->name,
            $body,
        );
    }

    private function findCustomerForChat(?string $phone, ?string $guestKey = null): Customer
    {
        $lookupPhone = $this->lookupPhone($phone, $guestKey);
        $customer = Customer::where('phone', $lookupPhone)->first();
        if (! $customer) {
            abort(404, 'Chat customer not found');
        }

        return $customer;
    }

    private function resolveCustomerForChat(?string $phone, string $name, ?string $guestKey = null): Customer
    {
        $lookupPhone = $this->lookupPhone($phone, $guestKey);

        $customer = Customer::where('phone', $lookupPhone)->first();
        if (! $customer) {
            $customer = Customer::create([
                'tenant_id' => $this->tenantContext->id(),
                'name' => $name !== '' ? $name : 'Guest',
                'phone' => $lookupPhone,
            ]);
        } elseif ($name !== '' && $name !== 'Guest' && ($customer->name === 'Guest' || $customer->name === '')) {
            $customer->update(['name' => $name]);
        }

        return $customer;
    }

    private function lookupPhone(?string $phone, ?string $guestKey = null): string
    {
        $phone = $phone !== null ? trim($phone) : '';
        $guestKey = $guestKey !== null ? trim($guestKey) : '';

        if ($phone === '' && $guestKey === '') {
            throw ValidationException::withMessages([
                'phone' => ['A phone number or guest key is required for chat.'],
            ]);
        }

        return $phone !== '' ? $phone : $this->guestPhoneFromKey($guestKey);
    }

    private function guestPhoneFromKey(string $guestKey): string
    {
        return 'g-'.substr(hash('sha256', $guestKey), 0, 28);
    }

    private function createMessage(
        ChatThread $thread,
        string $senderType,
        ?string $userId,
        ?string $customerId,
        ?string $label,
        string $body,
    ): ChatMessage {
        $body = trim($body);
        if ($body === '') {
            throw ValidationException::withMessages(['body' => ['Message body is required.']]);
        }

        $message = ChatMessage::create([
            'thread_id' => $thread->id,
            'sender_type' => $senderType,
            'sender_user_id' => $userId,
            'sender_customer_id' => $customerId,
            'sender_label' => $label,
            'body' => $body,
            'created_at' => now(),
        ]);

        $thread->touch();

        return $message;
    }

    private function assertTenantFeature(string $featureKey): void
    {
        $tenantId = $this->tenantContext->id();
        if (! $tenantId || ! $this->featureAccessService->canAccess($featureKey, $tenantId)) {
            abort(403, "Feature '{$featureKey}' is not available on your plan");
        }
    }

    private function notifyTenantUsersOfPlatformChat(ChatThread $thread, string $body): void
    {
        $users = User::withoutGlobalScopes()
            ->where('tenant_id', $thread->tenant_id)
            ->whereIn('role', ['owner', 'manager'])
            ->where('status', 'active')
            ->get();

        foreach ($users as $user) {
            $this->pushNotificationService->sendToUser(
                $thread->tenant_id,
                $user->id,
                'New platform message',
                $body,
                ['thread_id' => $thread->id],
            );
        }
    }
}
