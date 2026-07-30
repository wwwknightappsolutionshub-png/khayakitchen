<?php

namespace Tests\Feature;

use App\Modules\Auth\Domain\Models\User;
use App\Modules\Menu\Domain\Models\Meal;
use App\Modules\Orders\Domain\Models\Payment;
use App\Modules\TenantBranding\Domain\Models\TenantBranding;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;
use Tests\TestCase;

class BankTransferPaymentAccountsTest extends TestCase
{
    use RefreshDatabase;

    public function test_transfer_order_stays_pending_until_verified_then_accept(): void
    {
        Storage::fake('public');
        $this->seed();

        $tenant = \App\Modules\Auth\Domain\Models\Tenant::where('slug', 'pilot')->firstOrFail();
        TenantBranding::withoutGlobalScopes()
            ->where('tenant_id', $tenant->id)
            ->update([
                'bank_name' => 'First Bank',
                'bank_account_name' => 'Pilot Kitchen',
                'bank_account_number' => '0123456789',
            ]);

        $owner = User::where('email', 'owner@khayaos.com')->firstOrFail();
        $token = $owner->createToken('test')->plainTextToken;
        $meal = Meal::where('tenant_id', $tenant->id)->firstOrFail();

        $create = $this->postJson('/api/v1/customer/orders', [
            'name' => 'Transfer Customer',
            'phone' => '+2348011122233',
            'order_type' => 'pickup',
            'payment_method' => 'transfer',
            'items' => [['meal_id' => $meal->id, 'quantity' => 1, 'options' => []]],
        ], ['X-Tenant-Slug' => 'pilot']);

        $create->assertCreated();
        $orderId = $create->json('order_id');

        $this->assertDatabaseHas('payments', [
            'order_id' => $orderId,
            'provider' => 'transfer',
            'status' => 'pending',
        ]);

        $this->patchJson("/api/v1/orders/{$orderId}/status", ['status' => 'accepted'], [
            'Authorization' => "Bearer {$token}",
            'X-Tenant-Slug' => 'pilot',
        ])->assertStatus(422);

        $show = $this->getJson("/api/v1/customer/orders/{$orderId}?phone=".urlencode('+2348011122233'), [
            'X-Tenant-Slug' => 'pilot',
        ]);
        $show->assertOk();
        $this->assertFalse($show->json('order.payment.can_upload_proof'));

        Payment::where('order_id', $orderId)->update([
            'proof_wait_started_at' => now()->subSeconds(241),
        ]);

        $file = UploadedFile::fake()->create('receipt.pdf', 100, 'application/pdf');
        $upload = $this->post('/api/v1/customer/orders/'.$orderId.'/payment-proof', [
            'phone' => '+2348011122233',
            'proof' => $file,
        ], [
            'X-Tenant-Slug' => 'pilot',
            'Accept' => 'application/json',
        ]);
        $upload->assertOk();
        $this->assertTrue($upload->json('payment.proof_uploaded'));

        $this->patchJson("/api/v1/orders/{$orderId}/status", ['status' => 'accepted'], [
            'Authorization' => "Bearer {$token}",
            'X-Tenant-Slug' => 'pilot',
        ])->assertStatus(422);

        $accounts = $this->getJson('/api/v1/accounts', [
            'Authorization' => "Bearer {$token}",
            'X-Tenant-Slug' => 'pilot',
        ]);
        $accounts->assertOk();
        $this->assertNotEmpty($accounts->json('accounts'));

        $verify = $this->postJson("/api/v1/accounts/{$orderId}/verify", [], [
            'Authorization' => "Bearer {$token}",
            'X-Tenant-Slug' => 'pilot',
        ]);
        $verify->assertOk();
        $this->assertTrue($verify->json('account.payment_verified'));

        $this->assertDatabaseHas('payments', [
            'order_id' => $orderId,
            'status' => 'paid',
        ]);

        $this->patchJson("/api/v1/orders/{$orderId}/status", ['status' => 'accepted'], [
            'Authorization' => "Bearer {$token}",
            'X-Tenant-Slug' => 'pilot',
        ])->assertOk();
    }

    public function test_cash_payment_method_is_rejected(): void
    {
        $this->seed();
        $meal = Meal::firstOrFail();

        $this->postJson('/api/v1/customer/orders', [
            'name' => 'Cash Customer',
            'phone' => '+2348099988877',
            'order_type' => 'pickup',
            'payment_method' => 'cash',
            'items' => [['meal_id' => $meal->id, 'quantity' => 1, 'options' => []]],
        ], ['X-Tenant-Slug' => 'pilot'])->assertStatus(422);
    }

    public function test_owner_can_save_bank_details_on_branding(): void
    {
        $this->seed();
        $owner = User::where('email', 'owner@khayaos.com')->firstOrFail();
        $token = $owner->createToken('test')->plainTextToken;

        $response = $this->patchJson('/api/v1/branding', [
            'bank_name' => 'GTBank',
            'bank_account_name' => 'Khaya Pilot',
            'bank_account_number' => '9988776655',
        ], [
            'Authorization' => "Bearer {$token}",
            'X-Tenant-Slug' => 'pilot',
        ]);

        $response->assertOk()
            ->assertJsonPath('branding.bank_name', 'GTBank')
            ->assertJsonPath('branding.bank_account_number', '9988776655');

        $storefront = $this->getJson('/api/v1/storefront', ['X-Tenant-Slug' => 'pilot']);
        $storefront->assertOk()
            ->assertJsonPath('branding.bank_name', 'GTBank')
            ->assertJsonPath('branding.bank_account_name', 'Khaya Pilot');
    }
}
