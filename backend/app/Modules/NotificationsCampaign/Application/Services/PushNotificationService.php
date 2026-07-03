<?php

namespace App\Modules\NotificationsCampaign\Application\Services;

use App\Modules\NotificationsCampaign\Domain\Models\DeviceToken;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Str;

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

    /**
     * @param  array<string, mixed>  $context
     */
    private function deliverToToken(string $token, string $title, string $body, array $context): void
    {
        if (! config('services.webpush.enabled', false)) {
            Log::info('Push stub delivery', compact('token', 'title', 'body', 'context'));

            return;
        }

        throw new \RuntimeException('Web push provider not configured');
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
