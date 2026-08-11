<?php

namespace App\Modules\CRM\Interfaces\Controllers;

use App\Modules\CRM\Application\Services\CustomerAccountService;
use App\Modules\CRM\Application\Services\CustomerAuthService;
use App\Modules\CRM\Application\Services\CustomerPasskeyService;
use App\Modules\Loyalty\Application\Services\LoyaltyService;
use App\Modules\NotificationsCampaign\Application\Services\CustomerNotificationPreferenceService;
use App\Shared\Tenancy\TenantContext;
use App\Shared\Utils\ApiResponse;
use Illuminate\Http\Request;
use Illuminate\Routing\Controller;

class CustomerAccountController extends Controller
{
    public function __construct(
        private CustomerAuthService $authService,
        private CustomerAccountService $accountService,
        private LoyaltyService $loyaltyService,
        private CustomerNotificationPreferenceService $preferenceService,
        private TenantContext $tenantContext,
    ) {}

    public function requestOtp(Request $request)
    {
        $data = $request->validate([
            'phone' => ['required', 'string', 'max:50'],
            'email' => [
                ($request->input('mode') === 'signup') ? 'required' : 'nullable',
                'email',
                'max:255',
            ],
            'name' => ['nullable', 'string', 'max:255'],
            'mode' => ['nullable', 'in:signin,signup'],
        ]);

        return ApiResponse::success(
            $this->authService->requestOtp(
                $data['phone'],
                $data['email'] ?? null,
                $data['name'] ?? null,
                $data['mode'] ?? 'signin',
            ),
        );
    }

    public function verifyOtp(Request $request)
    {
        $data = $request->validate([
            'phone' => ['required', 'string', 'max:50'],
            'otp' => ['required', 'string', 'max:12'],
            'email' => ['nullable', 'email', 'max:255'],
            'password' => ['nullable', 'string', 'min:8', 'max:255', 'confirmed'],
        ]);

        return ApiResponse::success(
            $this->authService->verifyOtp(
                $data['phone'],
                $data['otp'],
                $data['email'] ?? null,
                $data['password'] ?? null,
            ),
        );
    }

    public function register(Request $request)
    {
        $data = $request->validate([
            'name' => ['required', 'string', 'max:255'],
            'email' => ['required', 'email', 'max:255'],
            'phone' => ['required', 'string', 'max:50'],
            'password' => ['required', 'string', 'min:8', 'max:255', 'confirmed'],
        ]);

        return ApiResponse::success(
            $this->authService->register(
                $data['name'],
                $data['email'],
                $data['phone'],
                $data['password'],
            ),
        );
    }

    public function loginPassword(Request $request)
    {
        $data = $request->validate([
            'phone' => ['required', 'string', 'max:50'],
            'password' => ['required', 'string', 'max:255'],
        ]);

        return ApiResponse::success(
            $this->authService->loginWithPassword($data['phone'], $data['password']),
        );
    }

    public function forgotPassword(Request $request)
    {
        $data = $request->validate([
            'phone' => ['required', 'string', 'max:50'],
            'email' => ['nullable', 'email', 'max:255'],
        ]);

        return ApiResponse::success(
            $this->authService->forgotPassword($data['phone'], $data['email'] ?? null),
        );
    }

    public function resetPassword(Request $request)
    {
        $data = $request->validate([
            'phone' => ['required', 'string', 'max:50'],
            'otp' => ['required', 'string', 'max:12'],
            'password' => ['required', 'string', 'min:8', 'max:255', 'confirmed'],
        ]);

        return ApiResponse::success(
            $this->authService->resetPassword($data['phone'], $data['otp'], $data['password']),
        );
    }

    public function setPassword(Request $request)
    {
        $session = $request->attributes->get('customer_session');
        $data = $request->validate([
            'password' => ['required', 'string', 'min:8', 'max:255', 'confirmed'],
            'current_password' => ['nullable', 'string', 'max:255'],
        ]);

        return ApiResponse::success([
            'customer' => $this->authService->customerPayload(
                $this->authService->setPassword(
                    $session,
                    $data['password'],
                    $data['current_password'] ?? null,
                ),
            ),
        ]);
    }

    public function passkeyRegisterOptions(Request $request, CustomerPasskeyService $passkeys)
    {
        $session = $request->attributes->get('customer_session');

        return ApiResponse::success($passkeys->registerOptions($session));
    }

    public function passkeyRegisterVerify(Request $request, CustomerPasskeyService $passkeys)
    {
        $session = $request->attributes->get('customer_session');
        $data = $request->validate([
            'challengeId' => ['required', 'string', 'max:80'],
            'credential' => ['required', 'array'],
            'device_label' => ['nullable', 'string', 'max:120'],
        ]);

        return ApiResponse::success(
            $passkeys->registerVerify(
                $session,
                $data['challengeId'],
                $data['credential'],
                $data['device_label'] ?? null,
            ),
        );
    }

    public function passkeyLoginOptions(Request $request, CustomerPasskeyService $passkeys)
    {
        $data = $request->validate([
            'phone' => ['nullable', 'string', 'max:50'],
        ]);

        return ApiResponse::success($passkeys->loginOptions($data['phone'] ?? null));
    }

    public function passkeyLoginVerify(Request $request, CustomerPasskeyService $passkeys)
    {
        $data = $request->validate([
            'challengeId' => ['required', 'string', 'max:80'],
            'credential' => ['required', 'array'],
        ]);

        return ApiResponse::success(
            $passkeys->loginVerify($data['challengeId'], $data['credential']),
        );
    }

    public function listPasskeys(Request $request, CustomerPasskeyService $passkeys)
    {
        $session = $request->attributes->get('customer_session');

        return ApiResponse::success([
            'credentials' => $passkeys->listCredentials($session),
        ]);
    }

    public function destroyPasskey(Request $request, string $id, CustomerPasskeyService $passkeys)
    {
        $session = $request->attributes->get('customer_session');
        $passkeys->deleteCredential($session, $id);

        return ApiResponse::success(['deleted' => true]);
    }

    public function logout(Request $request)
    {
        $session = $request->attributes->get('customer_session');
        $this->authService->logout($session);

        return ApiResponse::success(['logged_out' => true]);
    }

    public function me(Request $request)
    {
        $session = $request->attributes->get('customer_session');

        return ApiResponse::success($this->authService->dashboard($session));
    }

    public function updateMe(Request $request)
    {
        $session = $request->attributes->get('customer_session');
        $data = $request->validate([
            'name' => ['nullable', 'string', 'max:255'],
            'email' => ['nullable', 'email', 'max:255'],
        ]);

        return ApiResponse::success([
            'customer' => $this->authService->customerPayload(
                $this->accountService->updateProfile($session, $data),
            ),
        ]);
    }

    public function requestPhoneChange(Request $request)
    {
        $session = $request->attributes->get('customer_session');
        $data = $request->validate([
            'phone' => ['required', 'string', 'max:50'],
        ]);

        return ApiResponse::success(
            $this->accountService->requestPhoneChangeOtp($session, $data['phone']),
        );
    }

    public function confirmPhoneChange(Request $request)
    {
        $session = $request->attributes->get('customer_session');
        $data = $request->validate([
            'phone' => ['required', 'string', 'max:50'],
            'otp' => ['required', 'string', 'max:12'],
        ]);

        return ApiResponse::success([
            'customer' => $this->authService->customerPayload(
                $this->accountService->confirmPhoneChange($session, $data['phone'], $data['otp']),
            ),
        ]);
    }

    public function addresses(Request $request)
    {
        $session = $request->attributes->get('customer_session');

        return ApiResponse::success([
            'addresses' => $this->accountService->listAddresses($session),
        ]);
    }

    public function storeAddress(Request $request)
    {
        $session = $request->attributes->get('customer_session');
        $data = $request->validate([
            'label' => ['nullable', 'string', 'max:80'],
            'line1' => ['required', 'string', 'max:255'],
            'line2' => ['nullable', 'string', 'max:255'],
            'city' => ['nullable', 'string', 'max:120'],
            'state' => ['nullable', 'string', 'max:120'],
            'postal_code' => ['nullable', 'string', 'max:40'],
            'country' => ['nullable', 'string', 'max:80'],
            'is_default' => ['nullable', 'boolean'],
        ]);

        return ApiResponse::success([
            'address' => $this->accountService->saveAddress($session, $data),
        ], 201);
    }

    public function updateAddress(Request $request, string $id)
    {
        $session = $request->attributes->get('customer_session');
        $data = $request->validate([
            'label' => ['nullable', 'string', 'max:80'],
            'line1' => ['sometimes', 'string', 'max:255'],
            'line2' => ['nullable', 'string', 'max:255'],
            'city' => ['nullable', 'string', 'max:120'],
            'state' => ['nullable', 'string', 'max:120'],
            'postal_code' => ['nullable', 'string', 'max:40'],
            'country' => ['nullable', 'string', 'max:80'],
            'is_default' => ['nullable', 'boolean'],
        ]);

        return ApiResponse::success([
            'address' => $this->accountService->saveAddress($session, $data, $id),
        ]);
    }

    public function destroyAddress(Request $request, string $id)
    {
        $session = $request->attributes->get('customer_session');
        $this->accountService->deleteAddress($session, $id);

        return ApiResponse::success(['deleted' => true]);
    }

    public function redeem(Request $request)
    {
        $session = $request->attributes->get('customer_session');
        $data = $request->validate([
            'points' => ['required', 'integer', 'min:1', 'max:100000'],
            'reference_id' => ['nullable', 'string', 'max:80'],
        ]);

        $customer = \App\Modules\CRM\Domain\Models\Customer::findOrFail($session->customer_id);

        return ApiResponse::success([
            'loyalty' => $this->loyaltyService->redeemForCustomer(
                $customer->id,
                $customer->phone,
                (int) $data['points'],
                $data['reference_id'] ?? null,
            ),
        ]);
    }

    public function submitCustomMeal(Request $request)
    {
        $session = $request->attributes->get('customer_session');
        $data = $request->validate([
            'title' => ['nullable', 'string', 'max:160'],
            'message' => ['required', 'string', 'max:5000'],
            'constraints' => ['nullable', 'string', 'max:2000'],
        ]);

        return ApiResponse::success([
            'request' => $this->accountService->submitCustomMealRequest($session, $data),
        ], 201);
    }

    public function myCustomMeals(Request $request)
    {
        $session = $request->attributes->get('customer_session');

        return ApiResponse::success([
            'requests' => $this->accountService->listMyCustomMealRequests($session),
        ]);
    }

    public function notificationPreferences(Request $request)
    {
        $session = $request->attributes->get('customer_session');
        $customer = \App\Modules\CRM\Domain\Models\Customer::findOrFail($session->customer_id);
        $pref = $this->preferenceService->ensureDefaultOptIns(
            $this->tenantContext->id(),
            $customer,
        );

        return ApiResponse::success([
            'preferences' => [
                'push_enabled' => (bool) $pref->push_enabled,
                'whatsapp_enabled' => (bool) $pref->whatsapp_enabled,
                'email_enabled' => (bool) $pref->email_enabled,
                'phone' => $customer->phone,
            ],
        ]);
    }

    public function updateNotificationPreferences(Request $request)
    {
        $session = $request->attributes->get('customer_session');
        $customer = \App\Modules\CRM\Domain\Models\Customer::findOrFail($session->customer_id);
        $data = $request->validate([
            'push_enabled' => ['nullable', 'boolean'],
            'whatsapp_enabled' => ['nullable', 'boolean'],
            'email_enabled' => ['nullable', 'boolean'],
        ]);

        $existing = $this->preferenceService->ensureDefaultOptIns(
            $this->tenantContext->id(),
            $customer,
        );
        $pref = $this->preferenceService->upsertByPhone(
            $this->tenantContext->id(),
            $customer->phone,
            $customer->name,
            array_key_exists('push_enabled', $data)
                ? (bool) $data['push_enabled']
                : (bool) $existing->push_enabled,
            array_key_exists('whatsapp_enabled', $data)
                ? (bool) $data['whatsapp_enabled']
                : (bool) $existing->whatsapp_enabled,
            array_key_exists('email_enabled', $data)
                ? (bool) $data['email_enabled']
                : (bool) $existing->email_enabled,
        );

        return ApiResponse::success(['preferences' => $pref]);
    }
}
