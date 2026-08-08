<?php

namespace App\Console\Commands;

use App\Modules\Notifications\Application\Services\PlatformWhatsAppSettingsService;
use Illuminate\Console\Command;
use Illuminate\Validation\ValidationException;

/**
 * Sends a one-off platform WhatsApp so operators can verify Genius/credentials
 * without going through public signup. Same path as Super Admin → Platform Settings → Send test.
 */
class SendTestWhatsAppCommand extends Command
{
    protected $signature = 'whatsapp:send-test
        {phone : E.164 phone number, e.g. +447756183484}
        {--message= : Optional custom message body}';

    protected $description = 'Send a test WhatsApp using platform (Super Admin) credentials';

    public function handle(PlatformWhatsAppSettingsService $settingsService): int
    {
        $phone = (string) $this->argument('phone');
        $message = $this->option('message');
        $message = is_string($message) && trim($message) !== '' ? trim($message) : null;

        try {
            $result = $settingsService->sendTestMessage($phone, $message);
        } catch (ValidationException $e) {
            $first = collect($e->errors())->flatten()->first();
            $this->error(is_string($first) ? $first : 'Validation failed.');

            return self::FAILURE;
        }

        $this->info('Provider: '.$result['provider'].' (source: '.$result['source'].')');

        if (! ($result['sent'] ?? false)) {
            $this->error($result['error'] ?? 'Send failed.');

            return self::FAILURE;
        }

        $this->info('Send completed — check WhatsApp on '.$result['phone']);

        return self::SUCCESS;
    }
}
