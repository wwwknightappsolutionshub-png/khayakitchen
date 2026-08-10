<?php

namespace App\Modules\CRM\Application\Services;

use App\Modules\CRM\Domain\Models\Customer;
use App\Modules\CRM\Domain\Models\CustomerWebAuthnCredential;
use App\Modules\Pricing\Application\Services\AuditLogService;
use App\Modules\RevenueRecovery\Domain\Models\CustomerSession;
use App\Shared\Tenancy\TenantContext;
use Cose\Algorithms;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Str;
use Illuminate\Validation\ValidationException;
use ParagonIE\ConstantTime\Base64UrlSafe;
use Symfony\Component\Serializer\SerializerInterface;
use Webauthn\AttestationStatement\AttestationStatementSupportManager;
use Webauthn\AttestationStatement\NoneAttestationStatementSupport;
use Webauthn\AuthenticatorAssertionResponse;
use Webauthn\AuthenticatorAssertionResponseValidator;
use Webauthn\AuthenticatorAttestationResponse;
use Webauthn\AuthenticatorAttestationResponseValidator;
use Webauthn\AuthenticatorSelectionCriteria;
use Webauthn\CeremonyStep\CeremonyStepManagerFactory;
use Webauthn\Denormalizer\WebauthnSerializerFactory;
use Webauthn\PublicKeyCredential;
use Webauthn\PublicKeyCredentialCreationOptions;
use Webauthn\PublicKeyCredentialDescriptor;
use Webauthn\PublicKeyCredentialParameters;
use Webauthn\PublicKeyCredentialRequestOptions;
use Webauthn\PublicKeyCredentialRpEntity;
use Webauthn\PublicKeyCredentialSource;
use Webauthn\PublicKeyCredentialUserEntity;

class CustomerPasskeyService
{
    private ?SerializerInterface $serializer = null;

    public function __construct(
        private TenantContext $tenantContext,
        private AuditLogService $auditLogService,
    ) {}

    private function auth(): CustomerAuthService
    {
        return app(CustomerAuthService::class);
    }

    /**
     * @return array<string, mixed>
     */
    public function registerOptions(CustomerSession $session): array
    {
        $customer = Customer::findOrFail($session->customer_id);
        $tenantId = $this->tenantContext->id();
        $challenge = random_bytes(32);

        $exclude = $customer->webauthnCredentials()
            ->get()
            ->map(fn (CustomerWebAuthnCredential $cred) => PublicKeyCredentialDescriptor::create(
                PublicKeyCredentialDescriptor::CREDENTIAL_TYPE_PUBLIC_KEY,
                $this->decodeCredentialId($cred->credential_id),
                $cred->transports ?? [],
            ))
            ->all();

        $options = PublicKeyCredentialCreationOptions::create(
            PublicKeyCredentialRpEntity::create(
                (string) config('webauthn.rp_name'),
                (string) config('webauthn.rp_id'),
            ),
            PublicKeyCredentialUserEntity::create(
                $customer->email ?: $customer->phone ?: $customer->id,
                $customer->id,
                $customer->name ?: 'Customer',
            ),
            $challenge,
            [
                PublicKeyCredentialParameters::create('public-key', Algorithms::COSE_ALGORITHM_ES256),
                PublicKeyCredentialParameters::create('public-key', Algorithms::COSE_ALGORITHM_RS256),
            ],
            AuthenticatorSelectionCriteria::create(
                AuthenticatorSelectionCriteria::AUTHENTICATOR_ATTACHMENT_PLATFORM,
                AuthenticatorSelectionCriteria::USER_VERIFICATION_REQUIREMENT_PREFERRED,
                AuthenticatorSelectionCriteria::RESIDENT_KEY_REQUIREMENT_PREFERRED,
            ),
            PublicKeyCredentialCreationOptions::ATTESTATION_CONVEYANCE_PREFERENCE_NONE,
            $exclude,
            60000,
        );

        $challengeId = (string) Str::uuid();
        $this->storeChallenge($tenantId, $challengeId, 'register', [
            'customer_id' => $customer->id,
            'options' => $this->serializer()->normalize($options),
        ]);

        /** @var array<string, mixed> $normalized */
        $normalized = $this->serializer()->normalize($options);
        $normalized['challengeId'] = $challengeId;

        return $normalized;
    }

    /**
     * @param  array<string, mixed>  $credential
     * @return array{credential: array<string, mixed>}
     */
    public function registerVerify(CustomerSession $session, string $challengeId, array $credential, ?string $deviceLabel = null): array
    {
        $tenantId = $this->tenantContext->id();
        $customer = Customer::findOrFail($session->customer_id);
        $cached = $this->pullChallenge($tenantId, $challengeId, 'register');

        if (($cached['customer_id'] ?? null) !== $customer->id) {
            throw ValidationException::withMessages(['passkey' => ['Invalid registration challenge.']]);
        }

        if (config('webauthn.fake_ceremony')) {
            $credId = (string) ($credential['id'] ?? '');
            if ($credId === '') {
                throw ValidationException::withMessages(['passkey' => ['Invalid passkey response.']]);
            }
            $row = $this->persistCredential(
                $customer,
                $credId,
                json_encode(['fake' => true, 'publicKey' => $credential['response']['publicKey'] ?? 'test'], JSON_THROW_ON_ERROR),
                0,
                is_array($credential['response']['transports'] ?? null) ? $credential['response']['transports'] : ['internal'],
                $deviceLabel,
            );
        } else {
            /** @var PublicKeyCredentialCreationOptions $options */
            $options = $this->serializer()->denormalize(
                $cached['options'],
                PublicKeyCredentialCreationOptions::class,
            );

            /** @var PublicKeyCredential $publicKeyCredential */
            $publicKeyCredential = $this->serializer()->deserialize(
                json_encode($credential, JSON_THROW_ON_ERROR),
                PublicKeyCredential::class,
                'json',
            );

            if (! $publicKeyCredential->response instanceof AuthenticatorAttestationResponse) {
                throw ValidationException::withMessages(['passkey' => ['Invalid registration response.']]);
            }

            $factory = new CeremonyStepManagerFactory();
            $factory->setSecuredRelyingPartyId($this->securedRpIds());
            $validator = AuthenticatorAttestationResponseValidator::create($factory->creationCeremony());

            try {
                $source = $validator->check(
                    $publicKeyCredential->response,
                    $options,
                    (string) config('webauthn.rp_id'),
                );
            } catch (\Throwable $e) {
                throw ValidationException::withMessages([
                    'passkey' => ['Could not verify passkey: '.$e->getMessage()],
                ]);
            }

            $credId = Base64UrlSafe::encodeUnpadded($source->publicKeyCredentialId);
            $row = $this->persistCredential(
                $customer,
                $credId,
                json_encode($this->serializer()->normalize($source), JSON_THROW_ON_ERROR),
                $source->counter,
                $source->transports,
                $deviceLabel,
            );
        }

        $this->auditLogService->log(
            'customer.auth.passkey_register',
            $tenantId,
            null,
            'customer',
            $customer->id,
            ['credential_id' => $row->id],
        );

        return ['credential' => $this->credentialPayload($row)];
    }

    /**
     * @return array<string, mixed>
     */
    public function loginOptions(?string $phone = null): array
    {
        $tenantId = $this->tenantContext->id();
        $challenge = random_bytes(32);
        $allow = [];

        if ($phone) {
            $phone = $this->auth()->normalizePhone($phone);
            $customer = Customer::where('phone', $phone)->first();
            if ($customer) {
                $allow = $customer->webauthnCredentials()
                    ->get()
                    ->map(fn (CustomerWebAuthnCredential $cred) => PublicKeyCredentialDescriptor::create(
                        PublicKeyCredentialDescriptor::CREDENTIAL_TYPE_PUBLIC_KEY,
                        $this->decodeCredentialId($cred->credential_id),
                        $cred->transports ?? [],
                    ))
                    ->all();
            }
        }

        $options = PublicKeyCredentialRequestOptions::create(
            $challenge,
            (string) config('webauthn.rp_id'),
            $allow,
            AuthenticatorSelectionCriteria::USER_VERIFICATION_REQUIREMENT_PREFERRED,
            60000,
        );

        $challengeId = (string) Str::uuid();
        $this->storeChallenge($tenantId, $challengeId, 'login', [
            'options' => $this->serializer()->normalize($options),
            'phone' => $phone,
        ]);

        /** @var array<string, mixed> $normalized */
        $normalized = $this->serializer()->normalize($options);
        $normalized['challengeId'] = $challengeId;

        return $normalized;
    }

    /**
     * @param  array<string, mixed>  $credential
     * @return array{session_token: string, expires_at: string, customer: array<string, mixed>}
     */
    public function loginVerify(string $challengeId, array $credential): array
    {
        $tenantId = $this->tenantContext->id();
        $cached = $this->pullChallenge($tenantId, $challengeId, 'login');
        $credId = (string) ($credential['id'] ?? '');

        if ($credId === '') {
            throw ValidationException::withMessages(['passkey' => ['Invalid passkey response.']]);
        }

        $row = CustomerWebAuthnCredential::where('tenant_id', $tenantId)
            ->where('credential_id', $credId)
            ->first();

        if (! $row) {
            throw ValidationException::withMessages(['passkey' => ['Unknown passkey. Sign in with password or a code.']]);
        }

        $customer = Customer::findOrFail($row->customer_id);

        if (config('webauthn.fake_ceremony')) {
            // Accept without cryptographic verification in tests.
        } else {
            /** @var PublicKeyCredentialRequestOptions $options */
            $options = $this->serializer()->denormalize(
                $cached['options'],
                PublicKeyCredentialRequestOptions::class,
            );

            /** @var PublicKeyCredentialSource $source */
            $source = $this->serializer()->deserialize(
                $row->public_key,
                PublicKeyCredentialSource::class,
                'json',
            );

            /** @var PublicKeyCredential $publicKeyCredential */
            $publicKeyCredential = $this->serializer()->deserialize(
                json_encode($credential, JSON_THROW_ON_ERROR),
                PublicKeyCredential::class,
                'json',
            );

            if (! $publicKeyCredential->response instanceof AuthenticatorAssertionResponse) {
                throw ValidationException::withMessages(['passkey' => ['Invalid authentication response.']]);
            }

            $factory = new CeremonyStepManagerFactory();
            $factory->setSecuredRelyingPartyId($this->securedRpIds());
            $validator = AuthenticatorAssertionResponseValidator::create($factory->requestCeremony());

            try {
                $source = $validator->check(
                    $source,
                    $publicKeyCredential->response,
                    $options,
                    (string) config('webauthn.rp_id'),
                    $customer->id,
                );
            } catch (\Throwable $e) {
                throw ValidationException::withMessages([
                    'passkey' => ['Could not verify passkey: '.$e->getMessage()],
                ]);
            }

            $row->update([
                'counter' => $source->counter,
                'public_key' => json_encode($this->serializer()->normalize($source), JSON_THROW_ON_ERROR),
            ]);
        }

        $session = $this->auth()->issueSession($customer, $customer->email ?: '', 'account');

        $this->auditLogService->log(
            'customer.auth.passkey_login',
            $tenantId,
            null,
            'customer',
            $customer->id,
            ['credential_id' => $row->id],
        );

        return [
            'session_token' => $session->getAttribute('_plain_token'),
            'expires_at' => $session->expires_at->toIso8601String(),
            'customer' => $this->auth()->customerPayload($customer),
        ];
    }

    /**
     * @return list<array<string, mixed>>
     */
    public function listCredentials(CustomerSession $session): array
    {
        return CustomerWebAuthnCredential::where('customer_id', $session->customer_id)
            ->orderByDesc('created_at')
            ->get()
            ->map(fn (CustomerWebAuthnCredential $c) => $this->credentialPayload($c))
            ->all();
    }

    public function deleteCredential(CustomerSession $session, string $credentialId): void
    {
        $deleted = CustomerWebAuthnCredential::where('customer_id', $session->customer_id)
            ->where('id', $credentialId)
            ->delete();

        if (! $deleted) {
            throw ValidationException::withMessages(['passkey' => ['Passkey not found.']]);
        }

        $this->auditLogService->log(
            'customer.auth.passkey_removed',
            $this->tenantContext->id(),
            null,
            'customer',
            $session->customer_id,
            ['credential_id' => $credentialId],
        );
    }

    /**
     * @param  list<string>|null  $transports
     */
    private function persistCredential(
        Customer $customer,
        string $credentialId,
        string $publicKeyJson,
        int $counter,
        ?array $transports,
        ?string $deviceLabel,
    ): CustomerWebAuthnCredential {
        if (CustomerWebAuthnCredential::where('credential_id', $credentialId)->exists()) {
            throw ValidationException::withMessages(['passkey' => ['This passkey is already registered.']]);
        }

        return CustomerWebAuthnCredential::create([
            'tenant_id' => $this->tenantContext->id(),
            'customer_id' => $customer->id,
            'credential_id' => $credentialId,
            'public_key' => $publicKeyJson,
            'counter' => $counter,
            'transports' => $transports,
            'device_label' => $deviceLabel ?: 'This device',
        ]);
    }

    /**
     * @return array<string, mixed>
     */
    private function credentialPayload(CustomerWebAuthnCredential $cred): array
    {
        return [
            'id' => $cred->id,
            'device_label' => $cred->device_label,
            'created_at' => $cred->created_at?->toIso8601String(),
        ];
    }

    /**
     * @param  array<string, mixed>  $payload
     */
    private function storeChallenge(string $tenantId, string $challengeId, string $purpose, array $payload): void
    {
        Cache::put(
            $this->challengeKey($tenantId, $challengeId, $purpose),
            $payload,
            (int) config('webauthn.challenge_ttl_seconds', 300),
        );
    }

    /**
     * @return array<string, mixed>
     */
    private function pullChallenge(string $tenantId, string $challengeId, string $purpose): array
    {
        $key = $this->challengeKey($tenantId, $challengeId, $purpose);
        $payload = Cache::pull($key);

        if (! is_array($payload)) {
            throw ValidationException::withMessages(['passkey' => ['Passkey challenge expired. Try again.']]);
        }

        return $payload;
    }

    private function challengeKey(string $tenantId, string $challengeId, string $purpose): string
    {
        return "customer_webauthn:{$tenantId}:{$purpose}:{$challengeId}";
    }

    /**
     * @return list<string>
     */
    private function securedRpIds(): array
    {
        $rpId = (string) config('webauthn.rp_id');

        return array_values(array_unique(array_filter([$rpId, 'localhost'])));
    }

    private function decodeCredentialId(string $id): string
    {
        try {
            return Base64UrlSafe::decodeNoPadding($id);
        } catch (\Throwable) {
            return $id;
        }
    }

    private function serializer(): SerializerInterface
    {
        if ($this->serializer) {
            return $this->serializer;
        }

        $attestationManager = AttestationStatementSupportManager::create();
        $attestationManager->add(NoneAttestationStatementSupport::create());
        $this->serializer = (new WebauthnSerializerFactory($attestationManager))->create();

        return $this->serializer;
    }
}
