<?php

namespace App\Modules\Notifications\Application\Services;

use App\Modules\Notifications\Domain\Models\TenantWhatsAppSettings;

class WhatsAppCredentialResolver
{
    /**
     * Resolve WhatsApp sender credentials for a tenant, falling back to platform env.
     *
     * @return array{
     *     provider: string,
     *     source: 'tenant'|'platform',
     *     meta: array{access_token: ?string, phone_number_id: ?string},
     *     twilio: array{account_sid: ?string, auth_token: ?string, from: ?string}
     * }
     */
    public function resolve(?string $tenantId): array
    {
        if ($tenantId) {
            $settings = TenantWhatsAppSettings::withoutGlobalScopes()
                ->where('tenant_id', $tenantId)
                ->first();

            if ($settings && $settings->enabled) {
                if ($settings->provider === 'meta'
                    && filled($settings->access_token)
                    && filled($settings->phone_number_id)
                ) {
                    return [
                        'provider' => 'meta',
                        'source' => 'tenant',
                        'meta' => [
                            'access_token' => $settings->access_token,
                            'phone_number_id' => $settings->phone_number_id,
                        ],
                        'twilio' => $this->emptyTwilio(),
                    ];
                }

                if ($settings->provider === 'twilio'
                    && filled($settings->twilio_account_sid)
                    && filled($settings->twilio_auth_token)
                    && filled($settings->twilio_from)
                ) {
                    return [
                        'provider' => 'twilio',
                        'source' => 'tenant',
                        'meta' => $this->emptyMeta(),
                        'twilio' => [
                            'account_sid' => $settings->twilio_account_sid,
                            'auth_token' => $settings->twilio_auth_token,
                            'from' => $settings->twilio_from,
                        ],
                    ];
                }
            }
        }

        $provider = (string) config('whatsapp.provider', 'meta');

        return [
            'provider' => in_array($provider, ['meta', 'twilio'], true) ? $provider : 'meta',
            'source' => 'platform',
            'meta' => [
                'access_token' => config('whatsapp.meta.access_token'),
                'phone_number_id' => config('whatsapp.meta.phone_number_id'),
            ],
            'twilio' => [
                'account_sid' => config('whatsapp.twilio.account_sid'),
                'auth_token' => config('whatsapp.twilio.auth_token'),
                'from' => config('whatsapp.twilio.from'),
            ],
        ];
    }

    public function hasSendableCredentials(?string $tenantId): bool
    {
        $resolved = $this->resolve($tenantId);

        if ($resolved['provider'] === 'meta') {
            return filled($resolved['meta']['access_token']) && filled($resolved['meta']['phone_number_id']);
        }

        return filled($resolved['twilio']['account_sid'])
            && filled($resolved['twilio']['auth_token'])
            && filled($resolved['twilio']['from']);
    }

    /**
     * @return array{access_token: null, phone_number_id: null}
     */
    private function emptyMeta(): array
    {
        return ['access_token' => null, 'phone_number_id' => null];
    }

    /**
     * @return array{account_sid: null, auth_token: null, from: null}
     */
    private function emptyTwilio(): array
    {
        return ['account_sid' => null, 'auth_token' => null, 'from' => null];
    }
}
