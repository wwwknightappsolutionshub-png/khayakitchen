<?php

namespace App\Modules\NotificationsCampaign\Application\Services;

use App\Modules\NotificationsCampaign\Domain\Models\DeviceToken;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Str;
use Minishlink\WebPush\Subscription;
use Minishlink\WebPush\WebPush;

class PushNotificationService
{
    public function send(string $tenantId, string $customerId, string $title, string $body, array $context = []): bool
    {
        $tokens = DeviceToken::withoutGlobalScopes()
            ->where('tenant_id', $tenantId)
            ->where('customer_id', $customerId)
            ->pluck('device_token');

        return $this->deliverTokens($tenantId, $tokens, $title, $body, $context, $customerId, 'customer');
    }

    public function sendToUser(string $tenantId, string $userId, string $title, string $body, array $context = []): bool
    {
        $tokens = DeviceToken::withoutGlobalScopes()
            ->where('tenant_id', $tenantId)
            ->where('user_id', $userId)
            ->pluck('device_token');

        return $this->deliverTokens($tenantId, $tokens, $title, $body, $context, $userId, 'user');
    }

    /**
     * @param  \Illuminate\Support\Collection<int, string>  $tokens
     */
    private function deliverTokens(
        string $tenantId,
        $tokens,
        string $title,
        string $body,
        array $context,
        string $entityId,
        string $entityType,
    ): bool {
        if ($tokens->isEmpty()) {
            $this->logActivity($tenantId, 'push.skipped', $entityId, [
                'reason' => 'no_device_tokens',
                'title' => $title,
                'entity_type' => $entityType,
            ], $entityType);

            return false;
        }

        $delivered = 0;

        foreach ($tokens as $token) {
            try {
                $this->deliverToToken($token, $title, $body, $context);
                $delivered++;
            } catch (\Throwable $e) {
                Log::warning('Push delivery failed', [
                    'tenant_id' => $tenantId,
                    'entity_id' => $entityId,
                    'entity_type' => $entityType,
                    'error' => $e->getMessage(),
                ]);
            }
        }

        $this->logActivity($tenantId, 'push.sent', $entityId, [
            'title' => $title,
            'tokens' => $tokens->count(),
            'delivered' => $delivered,
            'entity_type' => $entityType,
        ], $entityType);

        return $delivered > 0;
    }

    public static function vapidPublicKey(): ?string
    {
        return config('services.webpush.vapid.public_key') ?: null;
    }

    /**
     * @param  array<string, mixed>  $context
     */
    private function deliverToToken(string $tokenJson, string $title, string $body, array $context): void
    {
        $publicKey = config('services.webpush.vapid.public_key');
        $privateKey = config('services.webpush.vapid.private_key');
        $subject = config('services.webpush.vapid.subject', 'mailto:admin@khayaos.com');

        if (! $publicKey || ! $privateKey) {
            Log::info('Push stub delivery (VAPID not configured)', compact('title', 'body', 'context'));

            return;
        }

        $payload = json_encode([
            'title' => $title,
            'body' => $body,
            'message' => $body,
            'data' => $context,
        ]);

        $subscription = Subscription::create(json_decode($tokenJson, true));
        $webPush = new WebPush([
            'VAPID' => [
                'subject' => $subject,
                'publicKey' => $publicKey,
                'privateKey' => $privateKey,
            ],
        ]);

        $report = $webPush->sendOneNotification($subscription, $payload);

        if (! $report->isSuccess()) {
            throw new \RuntimeException($report->getReason() ?? 'Push failed');
        }
    }

    /**
     * @param  array<string, mixed>  $metadata
     */
    private function logActivity(
        string $tenantId,
        string $action,
        string $entityId,
        array $metadata,
        string $entityType = 'customer',
    ): void {
        try {
            DB::table('activity_logs')->insert([
                'id' => (string) Str::uuid(),
                'tenant_id' => $tenantId,
                'user_id' => null,
                'action' => $action,
                'entity_type' => $entityType,
                'entity_id' => $entityId,
                'metadata' => json_encode($metadata),
                'created_at' => now(),
            ]);
        } catch (\Throwable $e) {
            Log::warning('Push activity log failed', [
                'tenant_id' => $tenantId,
                'action' => $action,
                'error' => $e->getMessage(),
            ]);
        }
    }
}
