<?php

namespace Tests\Feature;

use App\Modules\Auth\Domain\Models\Tenant;
use App\Modules\Auth\Domain\Models\User;
use App\Modules\CRM\Domain\Models\Customer;
use App\Modules\Menu\Domain\Models\Meal;
use App\Modules\Notifications\Application\Services\WhatsAppCredentialResolver;
use App\Modules\Notifications\Domain\Models\PlatformWhatsAppSettings;
use App\Modules\Notifications\Domain\Models\TenantWhatsAppSettings;
use App\Modules\Notifications\Jobs\SendOrderEmailNotificationJob;
use App\Modules\Notifications\Mail\CustomerOrderStatusMail;
use App\Modules\NotificationsCampaign\Domain\Models\CustomerNotificationPreference;
use App\Modules\Orders\Domain\Models\Order;
use App\Modules\RevenueRecovery\Mail\CustomerProximityOtpMail;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Mail;
use Illuminate\Support\Facades\Queue;
use Tests\TestCase;

class MultiChannelNotificationsAndMealShareTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        $this->seed();
    }

    public function test_tenant_whatsapp_settings_resolve_with_platform_fallback(): void
    {
        $owner = User::where('email', 'owner@khayaos.com')->firstOrFail();
        $tenant = Tenant::where('slug', 'pilot')->firstOrFail();
        $token = $owner->createToken('test')->plainTextToken;

        $show = $this->getJson('/api/v1/workspace/whatsapp', [
            'Authorization' => "Bearer {$token}",
            'X-Tenant-Slug' => 'pilot',
        ]);
        $show->assertOk();
        $show->assertJsonPath('whatsapp.using_platform_fallback', true);

        $update = $this->patchJson('/api/v1/workspace/whatsapp', [
            'enabled' => true,
            'provider' => 'meta',
            'phone_number_id' => 'tenant-phone-id',
            'access_token' => 'tenant-secret-token',
        ], [
            'Authorization' => "Bearer {$token}",
            'X-Tenant-Slug' => 'pilot',
        ]);
        $update->assertOk();
        $update->assertJsonPath('whatsapp.enabled', true);
        $update->assertJsonPath('whatsapp.has_access_token', true);
        $update->assertJsonPath('whatsapp.using_platform_fallback', false);
        $update->assertJsonPath('whatsapp.active_source', 'tenant');

        $this->assertDatabaseHas('tenant_whatsapp_settings', [
            'tenant_id' => $tenant->id,
            'phone_number_id' => 'tenant-phone-id',
            'enabled' => true,
        ]);

        $resolved = app(WhatsAppCredentialResolver::class)->resolve($tenant->id);
        $this->assertSame('tenant', $resolved['source']);
        $this->assertSame('tenant-secret-token', $resolved['meta']['access_token']);
        $this->assertSame('tenant-phone-id', $resolved['meta']['phone_number_id']);

        TenantWhatsAppSettings::where('tenant_id', $tenant->id)->update(['enabled' => false]);
        $fallback = app(WhatsAppCredentialResolver::class)->resolve($tenant->id);
        $this->assertSame('platform', $fallback['source']);
    }

    public function test_tenant_hosted_genius_session_overrides_platform_session_for_30_days(): void
    {
        $tenant = Tenant::where('slug', 'pilot')->firstOrFail();

        $platform = PlatformWhatsAppSettings::query()->first() ?? new PlatformWhatsAppSettings;
        $platform->fill([
            'enabled' => true,
            'provider' => 'genius',
            'api_key' => 'api-platform-key',
            'session_id' => 'session_platform_default',
            'base_url' => 'https://restapi.geniusdevel.com',
        ])->save();

        TenantWhatsAppSettings::create([
            'tenant_id' => $tenant->id,
            'enabled' => true,
            'provider' => 'genius',
            'hosted_session_id' => 'session_tenant_abc',
            'hosted_status' => 'active',
            'hosted_expires_at' => now()->addDays(30),
        ]);

        $resolved = app(WhatsAppCredentialResolver::class)->resolve($tenant->id);
        $this->assertSame('tenant', $resolved['source']);
        $this->assertSame('genius', $resolved['provider']);
        $this->assertSame('session_tenant_abc', $resolved['genius']['session_id']);
        $this->assertSame('api-platform-key', $resolved['genius']['api_key']);

        TenantWhatsAppSettings::withoutGlobalScopes()
            ->where('tenant_id', $tenant->id)
            ->update([
                'hosted_expires_at' => now()->subMinute(),
                'hosted_status' => 'active',
            ]);

        $expiredFallback = app(WhatsAppCredentialResolver::class)->resolve($tenant->id);
        $this->assertSame('platform', $expiredFallback['source']);
    }

    public function test_customer_otp_sends_email_and_whatsapp_in_parallel(): void
    {
        Mail::fake();

        $customer = Customer::firstOrCreate(
            [
                'phone' => '+15559870001',
                'tenant_id' => Tenant::where('slug', 'pilot')->value('id'),
            ],
            ['name' => 'OTP User', 'email' => 'otp-parallel@example.com'],
        );
        if (! $customer->email) {
            $customer->update(['email' => 'otp-parallel@example.com']);
        }

        $response = $this->postJson('/api/v1/customer/auth/request-otp', [
            'phone' => $customer->phone,
            'email' => $customer->email,
            'mode' => 'signin',
        ], ['X-Tenant-Slug' => 'pilot']);

        $response->assertOk();
        $response->assertJsonPath('sent', true);
        $this->assertStringContainsString('email', (string) $response->json('channel'));
        $this->assertStringContainsString('whatsapp', (string) $response->json('channel'));

        Mail::assertSent(CustomerProximityOtpMail::class);
        $this->assertDatabaseHas('customer_email_otps', [
            'phone' => $customer->phone,
            'purpose' => 'account',
        ]);
    }

    public function test_order_created_queues_email_alongside_whatsapp_and_push_path(): void
    {
        Queue::fake();
        Mail::fake();

        $tenant = Tenant::where('slug', 'pilot')->firstOrFail();
        $meal = Meal::where('tenant_id', $tenant->id)->firstOrFail();
        $customer = Customer::create([
            'tenant_id' => $tenant->id,
            'name' => 'Email Order Guest',
            'phone' => '+15559870022',
            'email' => 'order-email@example.com',
        ]);

        CustomerNotificationPreference::create([
            'tenant_id' => $tenant->id,
            'customer_id' => $customer->id,
            'push_enabled' => true,
            'whatsapp_enabled' => true,
            'email_enabled' => true,
        ]);

        $create = $this->postJson('/api/v1/customer/orders', [
            'name' => $customer->name,
            'phone' => $customer->phone,
            'email' => $customer->email,
            'order_type' => 'pickup',
            'payment_method' => 'card',
            'items' => [['meal_id' => $meal->id, 'quantity' => 1, 'options' => []]],
        ], ['X-Tenant-Slug' => 'pilot']);

        $create->assertCreated();
        Queue::assertPushed(SendOrderEmailNotificationJob::class);
    }

    public function test_meal_share_endpoint_exposes_tenant_og_fields(): void
    {
        $tenant = Tenant::where('slug', 'pilot')->firstOrFail();
        $meal = Meal::where('tenant_id', $tenant->id)->firstOrFail();

        $response = $this->getJson("/api/v1/storefront/meal-share/{$meal->id}", [
            'X-Tenant-Slug' => 'pilot',
        ]);

        $response->assertOk();
        $response->assertJsonPath('meal.id', $meal->id);
        $this->assertNotEmpty($response->json('restaurant_name'));
        $this->assertNotEmpty($response->json('og_title'));
        $this->assertStringContainsString('/r/pilot/meal/', (string) $response->json('share_url'));
    }

    public function test_order_email_job_sends_when_opted_in(): void
    {
        Mail::fake();

        $tenant = Tenant::where('slug', 'pilot')->firstOrFail();
        $customer = Customer::create([
            'tenant_id' => $tenant->id,
            'name' => 'Mail Job User',
            'phone' => '+15559870033',
            'email' => 'mail-job@example.com',
        ]);
        $order = Order::create([
            'tenant_id' => $tenant->id,
            'customer_id' => $customer->id,
            'status' => 'pending',
            'order_type' => 'pickup',
            'discount_total' => 0,
            'total_amount' => 10,
        ]);

        CustomerNotificationPreference::create([
            'tenant_id' => $tenant->id,
            'customer_id' => $customer->id,
            'push_enabled' => false,
            'whatsapp_enabled' => false,
            'email_enabled' => true,
        ]);

        (new SendOrderEmailNotificationJob(
            $tenant->id,
            $customer->id,
            $order->id,
            'OrderCreated',
            'Order received',
            'We received your order.',
        ))->handle(
            app(\App\Shared\Tenancy\TenantContextRunner::class),
            app(\App\Modules\NotificationsCampaign\Application\Services\CustomerNotificationPreferenceService::class),
        );

        Mail::assertSent(CustomerOrderStatusMail::class);
    }

    public function test_completed_order_thanks_email_includes_ctas_once(): void
    {
        Mail::fake();
        Queue::fake();

        $tenant = Tenant::where('slug', 'pilot')->firstOrFail();
        $owner = User::where('email', 'owner@khayaos.com')->firstOrFail();
        $customer = Customer::create([
            'tenant_id' => $tenant->id,
            'name' => 'Thanks User',
            'phone' => '+15559870044',
            'email' => 'thanks-user@example.com',
        ]);
        $order = Order::create([
            'tenant_id' => $tenant->id,
            'customer_id' => $customer->id,
            'status' => 'ready',
            'order_type' => 'pickup',
            'discount_total' => 0,
            'total_amount' => 18,
        ]);

        CustomerNotificationPreference::create([
            'tenant_id' => $tenant->id,
            'customer_id' => $customer->id,
            'push_enabled' => false,
            'whatsapp_enabled' => false,
            'email_enabled' => true,
        ]);

        $this->actingAs($owner, 'sanctum');
        $complete = $this->withHeaders(['X-Tenant-Slug' => 'pilot'])
            ->patchJson("/api/v1/orders/{$order->id}/status", ['status' => 'completed']);
        $complete->assertOk();

        Queue::assertPushed(SendOrderEmailNotificationJob::class, function (SendOrderEmailNotificationJob $job) use ($order) {
            return $job->eventKey === 'OrderCompleted' && $job->orderId === $order->id;
        });

        Mail::fake();
        (new SendOrderEmailNotificationJob(
            $tenant->id,
            $customer->id,
            $order->id,
            'OrderCompleted',
            'Thanks for ordering!',
            'Thank you for ordering with us!',
        ))->handle(
            app(\App\Shared\Tenancy\TenantContextRunner::class),
            app(\App\Modules\NotificationsCampaign\Application\Services\CustomerNotificationPreferenceService::class),
        );

        Mail::assertSent(CustomerOrderStatusMail::class, function (CustomerOrderStatusMail $mail) {
            return is_array($mail->ctas)
                && count($mail->ctas) >= 4
                && str_contains($mail->ctas[0]['url'] ?? '', 'review=1');
        });

        $noEmailCustomer = Customer::create([
            'tenant_id' => $tenant->id,
            'name' => 'No Email',
            'phone' => '+15559870055',
            'email' => null,
        ]);
        Mail::fake();
        (new SendOrderEmailNotificationJob(
            $tenant->id,
            $noEmailCustomer->id,
            $order->id,
            'OrderCompleted',
            'Thanks',
            'Body',
        ))->handle(
            app(\App\Shared\Tenancy\TenantContextRunner::class),
            app(\App\Modules\NotificationsCampaign\Application\Services\CustomerNotificationPreferenceService::class),
        );
        Mail::assertNothingSent();
    }
}
