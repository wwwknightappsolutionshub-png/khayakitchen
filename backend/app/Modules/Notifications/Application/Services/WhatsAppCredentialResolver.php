<?php

namespace App\Modules\Notifications\Application\Services;

use App\Modules\Notifications\Domain\Models\PlatformWhatsAppSettings;
use App\Modules\Notifications\Domain\Models\TenantWhatsAppSettings;

class WhatsAppCredentialResolver
{
    /**
     * Resolve WhatsApp sender credentials for a tenant, falling back to platform DB then env.
     *
     * @return array{
     *     provider: string,
     *     source: 'tenant'|'platform',
     *     meta: array{access_token: ?string, phone_number_id: ?string},
     *     twilio: array{account_sid: ?string, auth_token: ?string, from: ?string},
     *     genius: array{api_key: ?string, session_id: ?string, base_url: ?string}
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
                        'genius' => $this->emptyGenius(),
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
                        'genius' => $this->emptyGenius(),
                    ];
                }
            }
        }

        return $this->resolvePlatform();
    }

    public function hasSendableCredentials(?string $tenantId): bool
    {
        $resolved = $this->resolve($tenantId);

        if ($resolved['provider'] === 'genius') {
            return filled($resolved['genius']['api_key']) && filled($resolved['genius']['session_id']);
        }

        if ($resolved['provider'] === 'meta') {
            return filled($resolved['meta']['access_token']) && filled($resolved['meta']['phone_number_id']);
        }

        return filled($resolved['twilio']['account_sid'])
            && filled($resolved['twilio']['auth_token'])
            && filled($resolved['twilio']['from']);
    }

    /**
     * @return array{
     *     provider: string,
     *     source: 'platform',
     *     meta: array{access_token: ?string, phone_number_id: ?string},
     *     twilio: array{account_sid: ?string, auth_token: ?string, from: ?string},
     *     genius: array{api_key: ?string, session_id: ?string, base_url: ?string}
     * }
     */
    private function resolvePlatform(): array
    {
        $settings = PlatformWhatsAppSettings::query()->first();

        if ($settings && $settings->enabled) {
            if ($settings->provider === 'genius'
                && filled($settings->api_key)
                && filled($settings->session_id)
            ) {
                return [
                    'provider' => 'genius',
                    'source' => 'platform',
                    'meta' => $this->emptyMeta(),
                    'twilio' => $this->emptyTwilio(),
                    'genius' => [
                        'api_key' => $settings->api_key,
                        'session_id' => $settings->session_id,
                        'base_url' => $settings->base_url ?: config('whatsapp.genius.base_url'),
                    ],
                ];
            }

            if ($settings->provider === 'meta'
                && filled($settings->meta_access_token)
                && filled($settings->meta_phone_number_id)
            ) {
                return [
                    'provider' => 'meta',
                    'source' => 'platform',
                    'meta' => [
                        'access_token' => $settings->meta_access_token,
                        'phone_number_id' => $settings->meta_phone_number_id,
                    ],
                    'twilio' => $this->emptyTwilio(),
                    'genius' => $this->emptyGenius(),
                ];
            }

            if ($settings->provider === 'twilio'
                && filled($settings->twilio_account_sid)
                && filled($settings->twilio_auth_token)
                && filled($settings->twilio_from)
            ) {
                return [
                    'provider' => 'twilio',
                    'source' => 'platform',
                    'meta' => $this->emptyMeta(),
                    'twilio' => [
                        'account_sid' => $settings->twilio_account_sid,
                        'auth_token' => $settings->twilio_auth_token,
                        'from' => $settings->twilio_from,
                    ],
                    'genius' => $this->emptyGenius(),
                ];
            }
        }

        $provider = (string) config('whatsapp.provider', 'meta');
        if (! in_array($provider, ['genius', 'meta', 'twilio'], true)) {
            $provider = 'meta';
        }

        return [
            'provider' => $provider,
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
            'genius' => [
                'api_key' => config('whatsapp.genius.api_key'),
                'session_id' => config('whatsapp.genius.session_id'),
                'base_url' => config('whatsapp.genius.base_url'),
            ],
        ];
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

    /**
     * @return array{api_key: null, session_id: null, base_url: null}
     */
    private function emptyGenius(): array
    {
        return ['api_key' => null, 'session_id' => null, 'base_url' => null];
    }
}
