<?php

namespace App\Modules\Engagement\Application\Services;

use App\Modules\Auth\Domain\Models\User;
use App\Modules\CRM\Domain\Models\Customer;
use App\Modules\Engagement\Domain\Models\ChatMessage;
use App\Modules\Engagement\Domain\Models\ChatThread;
use App\Modules\NotificationsCampaign\Application\Services\PushNotificationService;
use App\Modules\Orders\Domain\Models\Order;
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

    /** Order statuses treated as “in session” for kitchen↔customer chat. */
    public const IN_SESSION_ORDER_STATUSES = ['pending', 'accepted', 'preparing', 'ready'];

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
            ->get()
            ->map(fn (ChatThread $thread) => $this->decorateThreadForList($thread));
    }

    public function listTenantCustomerThreads(array $permissions, bool $activeOrdersOnly = false): Collection
    {
        $this->permissionService->authorize($permissions, 'crm.view');
        $this->assertTenantFeature(self::FEATURE_TENANT_CUSTOMER);

        $query = ChatThread::where('type', 'tenant_customer')
            ->orderByDesc('updated_at')
            ->with([
                'customer',
                'order',
                'messages' => fn ($q) => $q->orderByDesc('created_at')->limit(1),
            ]);

        if ($activeOrdersOnly) {
            $activeOrderIds = Order::query()
                ->whereIn('status', self::IN_SESSION_ORDER_STATUSES)
                ->pluck('id');
            $activeCustomerIds = Order::query()
                ->whereIn('status', self::IN_SESSION_ORDER_STATUSES)
                ->whereNotNull('customer_id')
                ->distinct()
                ->pluck('customer_id');

            $query->where(function ($q) use ($activeOrderIds, $activeCustomerIds) {
                $q->whereIn('order_id', $activeOrderIds)
                    ->orWhereIn('customer_id', $activeCustomerIds);
            });
        }

        return $query->get()
            ->map(fn (ChatThread $thread) => $this->decorateThreadForList($thread, true));
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

    /**
     * Open (or reuse) a tenant↔customer thread.
     * When $orderId is set, the order must be in-session and belong to that customer.
     */
    public function openTenantCustomerThread(
        array $permissions,
        string $customerId,
        ?string $subject = null,
        ?string $orderId = null,
    ): ChatThread {
        $this->permissionService->authorize($permissions, 'crm.manage');
        $this->assertTenantFeature(self::FEATURE_TENANT_CUSTOMER);

        $customer = Customer::findOrFail($customerId);
        $user = $this->tenantContext->user();
        $order = null;

        if ($orderId) {
            $order = Order::query()->findOrFail($orderId);
            if ($order->customer_id !== $customer->id) {
                throw ValidationException::withMessages([
                    'order_id' => ['Order does not belong to this customer.'],
                ]);
            }
            if (! in_array($order->status, self::IN_SESSION_ORDER_STATUSES, true)) {
                throw ValidationException::withMessages([
                    'order_id' => ['Chat from order is only available while the order is in session (pending, accepted, preparing, or ready).'],
                ]);
            }

            $thread = ChatThread::where('type', 'tenant_customer')
                ->where('customer_id', $customer->id)
                ->where('order_id', $order->id)
                ->orderByDesc('updated_at')
                ->first();

            if ($thread) {
                return $this->decorateThreadForList($thread->load(['customer', 'order']), true);
            }

            $short = strtoupper(substr(str_replace('-', '', $order->id), 0, 8));
            $thread = ChatThread::create([
                'type' => 'tenant_customer',
                'tenant_id' => $this->tenantContext->id(),
                'subject' => $subject ?: ('Order '.$short),
                'created_by_user_id' => $user?->id,
                'customer_id' => $customer->id,
                'order_id' => $order->id,
            ]);

            $this->auditLogService->log(
                'engagement.order_chat.opened',
                $this->tenantContext->id(),
                $user?->id,
                'chat_thread',
                $thread->id,
                ['order_id' => $order->id, 'customer_id' => $customer->id],
            );

            return $this->decorateThreadForList($thread->load(['customer', 'order']), true);
        }

        $thread = ChatThread::where('type', 'tenant_customer')
            ->where('customer_id', $customer->id)
            ->whereNull('order_id')
            ->orderByDesc('updated_at')
            ->first();

        if (! $thread) {
            // Fall back to any existing customer thread (legacy) before creating a new general one.
            $thread = ChatThread::where('type', 'tenant_customer')
                ->where('customer_id', $customer->id)
                ->orderByDesc('updated_at')
                ->first();
        }

        if (! $thread) {
            $thread = ChatThread::create([
                'type' => 'tenant_customer',
                'tenant_id' => $this->tenantContext->id(),
                'subject' => $subject ?: ('Chat with '.$customer->name),
                'created_by_user_id' => $user?->id,
                'customer_id' => $customer->id,
            ]);
        }

        return $this->decorateThreadForList($thread->load(['customer', 'order']), true);
    }

    /**
     * Convenience: open chat from an in-session order id.
     */
    public function openTenantCustomerThreadForOrder(array $permissions, string $orderId): ChatThread
    {
        $order = Order::query()->findOrFail($orderId);
        if (! $order->customer_id) {
            throw ValidationException::withMessages([
                'order_id' => ['This order has no linked customer to chat with.'],
            ]);
        }

        return $this->openTenantCustomerThread(
            $permissions,
            $order->customer_id,
            null,
            $order->id,
        );
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
            try {
                $this->notifyTenantStaffOfCustomerChat(
                    $thread,
                    'Customer opened chat',
                    ($customer->name ?: 'Guest').' started a chat with the restaurant.',
                );
            } catch (\Throwable $e) {
                report($e);
            }
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

        $tenantId = $thread->tenant_id;
        $customerId = $thread->customer_id;
        $threadType = $thread->type;
        $threadIdForNotify = $thread->id;
        $notifyBody = $body;
        $staffLabel = $user?->name ?? 'Staff';

        // Never block the HTTP response on push / realtime side-effects.
        dispatch(function () use ($tenantId, $customerId, $threadType, $threadIdForNotify, $notifyBody, $staffLabel, $message) {
            try {
                if ($threadType === 'tenant_customer' && $customerId && $tenantId) {
                    app(PushNotificationService::class)->send(
                        $tenantId,
                        $customerId,
                        'New message from restaurant',
                        $notifyBody,
                        ['thread_id' => $threadIdForNotify],
                    );
                }
            } catch (\Throwable $e) {
                report($e);
            }

            try {
                $gateway = app(WebSocketGateway::class);
                $gateway->emitChatMessageCreated($tenantId, $threadType, $threadIdForNotify, [
                    'id' => $message->id,
                    'thread_id' => $threadIdForNotify,
                    'sender_type' => $message->sender_type,
                    'sender_label' => $message->sender_label,
                    'body' => $message->body,
                    'created_at' => optional($message->created_at)?->toIso8601String(),
                ]);
                $gateway->emitChatTyping($tenantId, $threadType, [
                    'thread_id' => $threadIdForNotify,
                    'thread_type' => $threadType,
                    'actor_type' => 'tenant_user',
                    'actor_label' => $staffLabel,
                    'is_typing' => false,
                ]);
            } catch (\Throwable $e) {
                report($e);
            }
        })->afterResponse();

        return $message->fresh() ?? $message;
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

        $tenantId = $thread->tenant_id;
        $threadType = $thread->type;
        $customerName = $customer->name ?: 'Guest';
        $notifyTitle = 'Urgent: customer message';
        $notifyBody = $customerName.': '.$body;
        $messagePayload = [
            'id' => $message->id,
            'thread_id' => $thread->id,
            'sender_type' => $message->sender_type,
            'sender_label' => $message->sender_label,
            'body' => $message->body,
            'created_at' => optional($message->created_at)?->toIso8601String(),
        ];
        $threadIdForJob = $thread->id;

        dispatch(function () use ($tenantId, $threadType, $threadIdForJob, $notifyTitle, $notifyBody, $customerName, $messagePayload) {
            try {
                $thread = ChatThread::withoutGlobalScopes()->find($threadIdForJob);
                if ($thread) {
                    $users = User::withoutGlobalScopes()
                        ->where('tenant_id', $thread->tenant_id)
                        ->whereIn('role', ['owner', 'manager'])
                        ->where('status', 'active')
                        ->get();
                    $push = app(PushNotificationService::class);
                    foreach ($users as $user) {
                        try {
                            $push->sendToUser(
                                $thread->tenant_id,
                                $user->id,
                                $notifyTitle,
                                $notifyBody,
                                [
                                    'thread_id' => $thread->id,
                                    'urgency' => 'high',
                                    'kind' => 'customer_chat',
                                    'url' => '/ops/inbox',
                                ],
                            );
                        } catch (\Throwable $e) {
                            report($e);
                        }
                    }
                }
            } catch (\Throwable $e) {
                report($e);
            }

            try {
                if ($tenantId) {
                    $gateway = app(WebSocketGateway::class);
                    $gateway->emitChatMessageCreated($tenantId, $threadType, $threadIdForJob, $messagePayload);
                    $gateway->emitChatTyping($tenantId, $threadType, [
                        'thread_id' => $threadIdForJob,
                        'thread_type' => $threadType,
                        'actor_type' => 'customer',
                        'actor_label' => $customerName,
                        'is_typing' => false,
                    ]);
                }
            } catch (\Throwable $e) {
                report($e);
            }
        })->afterResponse();

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

    private function decorateThreadForList(ChatThread $thread, bool $includeUnread = false): ChatThread
    {
        $last = $thread->messages->first();
        $thread->setAttribute('last_message_preview', $last?->body);
        $thread->setAttribute(
            'last_message_at',
            optional($last?->created_at)?->toIso8601String() ?? optional($thread->updated_at)?->toIso8601String(),
        );
        $thread->setAttribute(
            'customer_name',
            $thread->customer?->name ?? ($thread->type === 'platform_tenant' ? 'Platform' : 'Guest'),
        );
        $thread->setAttribute('customer_phone', $thread->customer?->phone);
        $thread->setAttribute('order_id', $thread->order_id);
        $thread->setAttribute('order_status', $thread->order?->status);
        $thread->setAttribute(
            'in_session',
            $thread->order_id
                ? in_array($thread->order?->status, self::IN_SESSION_ORDER_STATUSES, true)
                : false,
        );

        if ($includeUnread) {
            $thread->setAttribute(
                'unread_count',
                ChatMessage::where('thread_id', $thread->id)
                    ->where('sender_type', 'customer')
                    ->whereNull('read_at')
                    ->count(),
            );
        } else {
            $thread->setAttribute('unread_count', 0);
        }

        return $thread;
    }

    private function notifyTenantUsersOfPlatformChat(ChatThread $thread, string $body): void
    {
        $users = User::withoutGlobalScopes()
            ->where('tenant_id', $thread->tenant_id)
            ->whereIn('role', ['owner', 'manager'])
            ->where('status', 'active')
            ->get();

        foreach ($users as $user) {
            try {
                $this->pushNotificationService->sendToUser(
                    $thread->tenant_id,
                    $user->id,
                    'New platform message',
                    $body,
                    ['thread_id' => $thread->id],
                );
            } catch (\Throwable $e) {
                report($e);
            }
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
            try {
                $this->pushNotificationService->sendToUser(
                    $thread->tenant_id,
                    $user->id,
                    $title,
                    $body,
                    [
                        'thread_id' => $thread->id,
                        'urgency' => 'high',
                        'kind' => 'customer_chat',
                        'url' => '/ops/inbox',
                    ],
                );
            } catch (\Throwable $e) {
                report($e);
            }
        }
    }
}
