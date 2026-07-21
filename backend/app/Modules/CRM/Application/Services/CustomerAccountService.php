<?php

namespace App\Modules\CRM\Application\Services;

use App\Modules\CRM\Domain\Models\Customer;
use App\Modules\CRM\Domain\Models\CustomerAddress;
use App\Modules\CRM\Domain\Models\CustomerCustomMealRequest;
use App\Modules\Loyalty\Application\Services\LoyaltyProgramService;
use App\Modules\Pricing\Application\Services\AuditLogService;
use App\Modules\RevenueRecovery\Domain\Models\CustomerSession;
use App\Shared\Auth\PermissionService;
use App\Shared\Entitlements\FeatureAccessService;
use App\Shared\Tenancy\TenantContext;
use Illuminate\Validation\ValidationException;

class CustomerAccountService
{
    public const CUSTOM_MEAL_FEATURE = 'custom_meal_requests';

    public function __construct(
        private TenantContext $tenantContext,
        private AuditLogService $auditLogService,
        private PermissionService $permissionService,
        private FeatureAccessService $featureAccessService,
        private CustomerAuthService $customerAuthService,
    ) {}

    public function updateProfile(CustomerSession $session, array $data): Customer
    {
        $customer = Customer::findOrFail($session->customer_id);
        $updates = [];

        if (array_key_exists('name', $data) && is_string($data['name']) && trim($data['name']) !== '') {
            $updates['name'] = trim($data['name']);
        }

        if (array_key_exists('email', $data)) {
            $email = $data['email'] ? strtolower(trim((string) $data['email'])) : null;
            if ($email && ! filter_var($email, FILTER_VALIDATE_EMAIL)) {
                throw ValidationException::withMessages(['email' => ['Enter a valid email address.']]);
            }
            if ($email && $email !== $customer->email) {
                $taken = Customer::where('email', $email)->where('id', '!=', $customer->id)->exists();
                if ($taken) {
                    throw ValidationException::withMessages(['email' => ['This email is already used by another account.']]);
                }
                $updates['email'] = $email;
            }
        }

        if ($updates !== []) {
            $customer->update($updates);
            $customer = $customer->fresh();
            $this->auditLogService->log(
                'customer.profile_updated',
                $this->tenantContext->id(),
                null,
                'customer',
                $customer->id,
                array_keys($updates),
            );

            if (isset($updates['email'])) {
                app(LoyaltyProgramService::class)->sendInstallWelcomeIfDue($customer);
            }
        }

        return $customer;
    }

    /**
     * Change phone only after OTP verification against the NEW phone.
     */
    public function requestPhoneChangeOtp(CustomerSession $session, string $newPhone): array
    {
        $newPhone = $this->customerAuthService->normalizePhone($newPhone);
        $customer = Customer::findOrFail($session->customer_id);

        if ($newPhone === '' || $newPhone === $customer->phone) {
            throw ValidationException::withMessages(['phone' => ['Enter a different valid phone number.']]);
        }

        if (Customer::where('phone', $newPhone)->where('id', '!=', $customer->id)->exists()) {
            throw ValidationException::withMessages([
                'phone' => ['That phone number already belongs to another customer.'],
            ]);
        }

        return $this->customerAuthService->requestPhoneChangeOtp($customer, $newPhone);
    }

    public function confirmPhoneChange(CustomerSession $session, string $newPhone, string $otp): Customer
    {
        $customer = Customer::findOrFail($session->customer_id);

        return $this->customerAuthService->confirmPhoneChange($customer, $session, $newPhone, $otp);
    }

    public function listAddresses(CustomerSession $session)
    {
        return CustomerAddress::where('customer_id', $session->customer_id)
            ->orderByDesc('is_default')
            ->orderBy('created_at')
            ->get();
    }

    public function saveAddress(CustomerSession $session, array $data, ?string $id = null): CustomerAddress
    {
        $customerId = $session->customer_id;

        if ($id) {
            $address = CustomerAddress::where('customer_id', $customerId)->where('id', $id)->firstOrFail();
            $address->update([
                'label' => $data['label'] ?? $address->label,
                'line1' => $data['line1'] ?? $address->line1,
                'line2' => array_key_exists('line2', $data) ? $data['line2'] : $address->line2,
                'city' => array_key_exists('city', $data) ? $data['city'] : $address->city,
                'state' => array_key_exists('state', $data) ? $data['state'] : $address->state,
                'postal_code' => array_key_exists('postal_code', $data) ? $data['postal_code'] : $address->postal_code,
                'country' => array_key_exists('country', $data) ? $data['country'] : $address->country,
                'is_default' => array_key_exists('is_default', $data) ? (bool) $data['is_default'] : $address->is_default,
            ]);
        } else {
            $address = CustomerAddress::create([
                'tenant_id' => $this->tenantContext->id(),
                'customer_id' => $customerId,
                'label' => $data['label'] ?? null,
                'line1' => $data['line1'],
                'line2' => $data['line2'] ?? null,
                'city' => $data['city'] ?? null,
                'state' => $data['state'] ?? null,
                'postal_code' => $data['postal_code'] ?? null,
                'country' => $data['country'] ?? null,
                'is_default' => (bool) ($data['is_default'] ?? false),
            ]);
        }

        if ($address->is_default) {
            CustomerAddress::where('customer_id', $customerId)
                ->where('id', '!=', $address->id)
                ->update(['is_default' => false]);
        }

        $this->auditLogService->log(
            'customer.address_saved',
            $this->tenantContext->id(),
            null,
            'customer_address',
            $address->id,
            ['customer_id' => $customerId],
        );

        return $address->fresh();
    }

    public function deleteAddress(CustomerSession $session, string $id): void
    {
        $address = CustomerAddress::where('customer_id', $session->customer_id)->where('id', $id)->firstOrFail();
        $address->delete();

        $this->auditLogService->log(
            'customer.address_deleted',
            $this->tenantContext->id(),
            null,
            'customer_address',
            $id,
            ['customer_id' => $session->customer_id],
        );
    }

    public function submitCustomMealRequest(CustomerSession $session, array $data): CustomerCustomMealRequest
    {
        $this->featureAccessService->assertAccess(self::CUSTOM_MEAL_FEATURE);

        $row = CustomerCustomMealRequest::create([
            'tenant_id' => $this->tenantContext->id(),
            'customer_id' => $session->customer_id,
            'title' => $data['title'] ?? null,
            'message' => $data['message'],
            'constraints' => $data['constraints'] ?? null,
            'status' => CustomerCustomMealRequest::STATUS_SUBMITTED,
        ]);

        $this->auditLogService->log(
            'customer.custom_meal_submitted',
            $this->tenantContext->id(),
            null,
            'customer_custom_meal_request',
            $row->id,
            ['customer_id' => $session->customer_id],
        );

        return $row;
    }

    public function listMyCustomMealRequests(CustomerSession $session)
    {
        return CustomerCustomMealRequest::where('customer_id', $session->customer_id)
            ->orderByDesc('created_at')
            ->limit(50)
            ->get();
    }

    public function listCustomMealRequestsForStaff(array $permissions)
    {
        $this->permissionService->authorize($permissions, 'orders.view');
        $this->featureAccessService->assertAccess(self::CUSTOM_MEAL_FEATURE);

        return CustomerCustomMealRequest::with('customer')
            ->orderByDesc('created_at')
            ->limit(100)
            ->get();
    }

    public function updateCustomMealRequestStatus(string $id, string $status, array $permissions, ?string $staffNote = null): CustomerCustomMealRequest
    {
        $this->permissionService->authorize($permissions, 'orders.update');
        $this->featureAccessService->assertAccess(self::CUSTOM_MEAL_FEATURE);

        if (! in_array($status, [
            CustomerCustomMealRequest::STATUS_SUBMITTED,
            CustomerCustomMealRequest::STATUS_ACKNOWLEDGED,
            CustomerCustomMealRequest::STATUS_CLOSED,
        ], true)) {
            throw ValidationException::withMessages(['status' => ['Invalid status.']]);
        }

        $row = CustomerCustomMealRequest::findOrFail($id);
        $updates = [
            'status' => $status,
            'handled_by' => $this->tenantContext->user()?->id,
            'staff_note' => $staffNote ?? $row->staff_note,
        ];

        if ($status === CustomerCustomMealRequest::STATUS_ACKNOWLEDGED) {
            $updates['acknowledged_at'] = now();
        }
        if ($status === CustomerCustomMealRequest::STATUS_CLOSED) {
            $updates['closed_at'] = now();
        }

        $row->update($updates);

        $this->auditLogService->log(
            'customer.custom_meal_status_updated',
            $this->tenantContext->id(),
            $this->tenantContext->user()?->id,
            'customer_custom_meal_request',
            $row->id,
            ['status' => $status],
        );

        return $row->fresh('customer');
    }
}
