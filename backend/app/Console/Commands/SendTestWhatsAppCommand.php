<?php

namespace App\Console\Commands;

use App\Modules\Notifications\Application\Services\WhatsAppCredentialResolver;
use App\Modules\Notifications\Infrastructure\WhatsApp\Contracts\WhatsAppProviderInterface;
use Illuminate\Console\Command;

/**
 * Sends a one-off platform WhatsApp so operators can verify Genius/credentials
 * without going through public signup.
 */
class SendTestWhatsAppCommand extends Command
{
    protected $signature = 'whatsapp:send-test
        {phone : E.164 phone number, e.g. +447756183484}
        {--message=KhayaOS platform WhatsApp test - if you received this, delivery works.}';

    protected $description = 'Send a test WhatsApp using platform (Super Admin) credentials';

    public function handle(
        WhatsAppCredentialResolver $resolver,
        WhatsAppProviderInterface $provider,
    ): int {
        $phone = preg_replace('/\s+/', '', trim((string) $this->argument('phone'))) ?? '';
        if ($phone === '' || ! str_starts_with($phone, '+')) {
            $this->error('Phone must be E.164, e.g. +447756183484');

            return self::FAILURE;
        }

        $resolved = $resolver->resolve(null);
        $this->info('Provider: '.$resolved['provider'].' (source: '.$resolved['source'].')');

        if (! $resolver->hasSendableCredentials(null)) {
            $this->error('Platform WhatsApp credentials are incomplete.');
            $this->line('Super Admin → Platform Settings → WhatsApp: enable + Genius api_key + session_id.');

            return self::FAILURE;
        }

        try {
            $provider->send($phone, (string) $this->option('message'), [
                'type' => 'platform_test',
                'tenant_id' => null,
            ]);
        } catch (\Throwable $e) {
            $this->error('Send failed: '.$e->getMessage());

            return self::FAILURE;
        }

        $this->info('Send completed — check WhatsApp on '.$phone);

        return self::SUCCESS;
    }
}
