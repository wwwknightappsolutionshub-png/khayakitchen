<?php

namespace App\Modules\Notifications\Infrastructure\WhatsApp\Providers;

use App\Modules\Notifications\Application\Services\WhatsAppCredentialResolver;
use App\Modules\Notifications\Infrastructure\WhatsApp\Contracts\WhatsAppProviderInterface;

class DelegatingWhatsAppProvider implements WhatsAppProviderInterface
{
    public function __construct(
        private WhatsAppCredentialResolver $credentialResolver,
        private MetaCloudWhatsAppProvider $metaProvider,
        private TwilioWhatsAppProvider $twilioProvider,
    ) {}

    public function send(string $toPhone, string $message, array $context = []): void
    {
        $tenantId = isset($context['tenant_id']) ? (string) $context['tenant_id'] : null;
        $resolved = $this->credentialResolver->resolve($tenantId);

        if ($resolved['provider'] === 'twilio') {
            $this->twilioProvider->sendWithCredentials(
                $toPhone,
                $message,
                $resolved['twilio'],
                array_merge($context, ['credential_source' => $resolved['source']]),
            );

            return;
        }

        $this->metaProvider->sendWithCredentials(
            $toPhone,
            $message,
            $resolved['meta'],
            array_merge($context, ['credential_source' => $resolved['source']]),
        );
    }
}
