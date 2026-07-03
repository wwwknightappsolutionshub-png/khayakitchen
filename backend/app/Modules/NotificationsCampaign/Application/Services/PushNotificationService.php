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

        if ($tokens->isEmpty()) {
            $this->logActivity($tenantId, 'push.skipped', $customerId, [
                'reason' => 'no_device_tokens',
                'title' => $title,
            ]);

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
                    'customer_id' => $customerId,
                    'error' => $e->getMessage(),
                ]);
            }
        }

        $this->logActivity($tenantId, 'push.sent', $customerId, [
            'title' => $title,
            'tokens' => $tokens->count(),
            'delivered' => $delivered,
        ]);

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
    private function logActivity(string $tenantId, string $action, string $customerId, array $metadata): void
    {
        DB::table('activity_logs')->insert([
            'id' => (string) Str::uuid(),
            'tenant_id' => $tenantId,
            'user_id' => null,
            'action' => $action,
            'entity_type' => 'customer',
            'entity_id' => $customerId,
            'metadata' => json_encode($metadata),
            'created_at' => now(),
        ]);
    }
}
