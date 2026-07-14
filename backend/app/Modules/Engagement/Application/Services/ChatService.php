<?php

namespace App\Modules\Engagement\Application\Services;

use App\Modules\Auth\Domain\Models\User;
use App\Modules\CRM\Domain\Models\Customer;
use App\Modules\Engagement\Domain\Models\ChatMessage;
use App\Modules\Engagement\Domain\Models\ChatThread;
use App\Modules\NotificationsCampaign\Application\Services\PushNotificationService;
use App\Modules\Pricing\Application\Services\AuditLogService;
use App\Modules\Realtime\Infrastructure\WebSocketGateway;
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
        private WebSocketGateway $webSocketGateway,
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
        $this->reassignGuestThreadsToPhoneCustomer($phone, $guestKey, $customer);

        $thread = ChatThread::where('type', 'tenant_customer')
            ->where('customer_id', $customer->id)
            ->orderByDesc('updated_at')
            ->first();

        $created = false;
        if (! $thread) {
            $thread = ChatThread::create([
                'type' => 'tenant_customer',
                'tenant_id' => $this->tenantContext->id(),
                'subject' => $subject ?: 'Customer support',
                'customer_id' => $customer->id,
            ]);
            $created = true;
        }

        if ($created) {
            $this->notifyTenantStaffOfCustomerChat(
                $thread,
                'Customer opened chat',
                ($customer->name ?: 'Guest').' started a chat with the restaurant.',
            );
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
            $this->markInboundMessagesRead($thread);
        }

        return $thread->fresh(['messages']);
    }

    /**
     * @return array{unread_customer_messages: int, unread_threads: int}
     */
    public function customerChatBadgeCounts(array $permissions): array
    {
        $this->permissionService->authorize($permissions, 'crm.view');
        if (! $this->featureAccessService->canAccess(self::FEATURE_TENANT_CUSTOMER)) {
            return ['unread_customer_messages' => 0, 'unread_threads' => 0];
        }

        $threadIds = ChatThread::where('type', 'tenant_customer')->pluck('id');
        $unread = ChatMessage::whereIn('thread_id', $threadIds)
            ->where('sender_type', 'customer')
            ->whereNull('read_at')
            ->get(['id', 'thread_id']);

        return [
            'unread_customer_messages' => $unread->count(),
            'unread_threads' => $unread->pluck('thread_id')->unique()->count(),
        ];
    }

    private function markInboundMessagesRead(ChatThread $thread): void
    {
        ChatMessage::where('thread_id', $thread->id)
            ->where('sender_type', 'customer')
            ->whereNull('read_at')
            ->update(['read_at' => now()]);
    }

    public function messagesForCustomer(string $threadId, ?string $phone, ?string $guestKey = null): ChatThread
    {
        $this->assertTenantFeature(self::FEATURE_TENANT_CUSTOMER);
        $thread = ChatThread::with('messages')->findOrFail($threadId);
        $this->assertCustomerOwnsThread($thread, $phone, $guestKey);

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
        $this->broadcastMessage($thread, $message);
        $this->broadcastTyping($thread, 'platform_user', PlatformRoles::labelForRole($platformUser->role), false);

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

        $this->broadcastMessage($thread, $message);
        $this->broadcastTyping($thread, 'tenant_user', $user?->name ?? 'Staff', false);

        return $message;
    }

    public function postCustomerMessage(string $threadId, ?string $phone, string $body, ?string $guestKey = null): ChatMessage
    {
        $this->assertTenantFeature(self::FEATURE_TENANT_CUSTOMER);
        $thread = ChatThread::findOrFail($threadId);
        $customer = $this->assertCustomerOwnsThread($thread, $phone, $guestKey);

        $message = $this->createMessage(
            $thread,
            'customer',
            null,
            $customer->id,
            $customer->name,
            $body,
        );

        $this->notifyTenantStaffOfCustomerChat(
            $thread,
            'Urgent: customer message',
            ($customer->name ?: 'Guest').': '.$body,
        );

        $this->broadcastMessage($thread, $message);
        $this->broadcastTyping($thread, 'customer', $customer->name ?: 'Guest', false);

        return $message;
    }

    public function setTenantTyping(string $threadId, bool $isTyping, array $permissions): void
    {
        $thread = ChatThread::findOrFail($threadId);
        $user = $this->tenantContext->user();

        if ($thread->type === 'platform_tenant') {
            $this->permissionService->authorize($permissions, 'settings.manage');
            $this->assertTenantFeature(self::FEATURE_PLATFORM_TENANT);
        } else {
            $this->permissionService->authorize($permissions, 'crm.manage');
            $this->assertTenantFeature(self::FEATURE_TENANT_CUSTOMER);
        }

        $this->broadcastTyping($thread, 'tenant_user', $user?->name ?? 'Staff', $isTyping);
    }

    public function setCustomerTyping(string $threadId, ?string $phone, bool $isTyping, ?string $guestKey = null): void
    {
        $this->assertTenantFeature(self::FEATURE_TENANT_CUSTOMER);
        $thread = ChatThread::findOrFail($threadId);
        $customer = $this->assertCustomerOwnsThread($thread, $phone, $guestKey);
        $this->broadcastTyping($thread, 'customer', $customer->name ?: 'Guest', $isTyping);
    }

    public function setPlatformTyping(User $platformUser, string $threadId, bool $isTyping): void
    {
        if (! PlatformRoles::isPlatformStaff($platformUser)) {
            abort(403, 'Platform staff access required');
        }

        $thread = ChatThread::withoutGlobalScopes()->findOrFail($threadId);
        if ($thread->type !== 'platform_tenant') {
            abort(404);
        }

        $this->broadcastTyping(
            $thread,
            'platform_user',
            PlatformRoles::labelForRole($platformUser->role),
            $isTyping,
        );
    }

    private function assertCustomerOwnsThread(ChatThread $thread, ?string $phone, ?string $guestKey = null): Customer
    {
        if ($thread->type !== 'tenant_customer') {
            abort(403, 'Chat access denied');
        }

        $this->reassignGuestThreadsToPhoneCustomer(
            $phone,
            $guestKey,
            $this->resolveCustomerForChat($phone, 'Guest', $guestKey),
        );
        $thread->refresh();

        $candidates = $this->candidateCustomers($phone, $guestKey);
        foreach ($candidates as $candidate) {
            if ($thread->customer_id === $candidate->id) {
                return $candidate;
            }
        }

        abort(403, 'Chat access denied');
    }

    /**
     * @return list<Customer>
     */
    private function candidateCustomers(?string $phone, ?string $guestKey = null): array
    {
        $candidates = [];
        $phone = $phone !== null ? trim($phone) : '';
        $guestKey = $guestKey !== null ? trim($guestKey) : '';

        if ($phone !== '') {
            $byPhone = Customer::where('phone', $phone)->first();
            if ($byPhone) {
                $candidates[] = $byPhone;
            }
        }

        if ($guestKey !== '') {
            $byGuest = Customer::where('phone', $this->guestPhoneFromKey($guestKey))->first();
            if ($byGuest) {
                $candidates[] = $byGuest;
            }
        }

        return $candidates;
    }

    private function reassignGuestThreadsToPhoneCustomer(?string $phone, ?string $guestKey, Customer $phoneCustomer): void
    {
        $phone = $phone !== null ? trim($phone) : '';
        $guestKey = $guestKey !== null ? trim($guestKey) : '';
        if ($phone === '' || $guestKey === '') {
            return;
        }

        $guestCustomer = Customer::where('phone', $this->guestPhoneFromKey($guestKey))->first();
        if (! $guestCustomer || $guestCustomer->id === $phoneCustomer->id) {
            return;
        }

        ChatThread::where('type', 'tenant_customer')
            ->where('customer_id', $guestCustomer->id)
            ->update(['customer_id' => $phoneCustomer->id]);
    }

    private function resolveCustomerForChat(?string $phone, string $name, ?string $guestKey = null): Customer
    {
        $phone = $phone !== null ? trim($phone) : '';
        $guestKey = $guestKey !== null ? trim($guestKey) : '';

        if ($phone === '' && $guestKey === '') {
            throw ValidationException::withMessages([
                'phone' => ['A phone number or guest key is required for chat.'],
            ]);
        }

        // Prefer real phone CRM row when available (post-checkout).
        $lookupPhone = $phone !== '' ? $phone : $this->guestPhoneFromKey($guestKey);

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

    private function broadcastMessage(ChatThread $thread, ChatMessage $message): void
    {
        if (! $thread->tenant_id) {
            return;
        }

        $this->webSocketGateway->emitChatMessageCreated($thread->tenant_id, $thread->type, $thread->id, [
            'id' => $message->id,
            'thread_id' => $thread->id,
            'sender_type' => $message->sender_type,
            'sender_label' => $message->sender_label,
            'body' => $message->body,
            'created_at' => optional($message->created_at)?->toIso8601String(),
        ]);
    }

    private function broadcastTyping(ChatThread $thread, string $actorType, string $actorLabel, bool $isTyping): void
    {
        if (! $thread->tenant_id) {
            return;
        }

        $this->webSocketGateway->emitChatTyping($thread->tenant_id, $thread->type, [
            'thread_id' => $thread->id,
            'thread_type' => $thread->type,
            'actor_type' => $actorType,
            'actor_label' => $actorLabel,
            'is_typing' => $isTyping,
        ]);
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

    private function notifyTenantStaffOfCustomerChat(ChatThread $thread, string $title, string $body): void
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
                $title,
                $body,
                [
                    'thread_id' => $thread->id,
                    'urgency' => 'high',
                    'kind' => 'customer_chat',
                    'url' => '/inbox',
                ],
            );
        }
    }
}
