<?php

namespace Tests\Feature;

use App\Modules\Auth\Domain\Models\Tenant;
use App\Modules\Auth\Domain\Models\User;
use App\Modules\Platform\Application\Services\OpsPwaInstallNudgeService;
use App\Modules\Platform\Jobs\ScheduleExistingOwnerOpsPwaNudgesJob;
use App\Modules\Platform\Jobs\SendOpsPwaInstallNudgeJob;
use App\Modules\Platform\Mail\OpsPwaInstallNudgeMail;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Mail;
use Illuminate\Support\Facades\Queue;
use Tests\TestCase;

class OpsPwaInstallNudgeTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        $this->seed();
    }

    public function test_new_owner_nudge_is_queued_with_300_second_delay(): void
    {
        Queue::fake();
        Mail::fake();

        app(OpsPwaInstallNudgeService::class)->scheduleForNewOwner(
            User::where('email', 'owner@khayaos.com')->value('id'),
        );

        Queue::assertPushed(SendOpsPwaInstallNudgeJob::class, function (SendOpsPwaInstallNudgeJob $job) {
            $delay = $job->delay;
            if ($delay instanceof \DateTimeInterface) {
                $seconds = $delay->getTimestamp() - now()->getTimestamp();

                return $seconds >= 290 && $seconds <= 310;
            }

            return false;
        });
    }

    public function test_nudge_email_sends_once_and_skips_when_ops_pwa_already_installed(): void
    {
        Mail::fake();
        $owner = User::where('email', 'owner@khayaos.com')->firstOrFail();
        $service = app(OpsPwaInstallNudgeService::class);

        $this->assertTrue($service->sendForOwner($owner->fresh()));
        Mail::assertSent(OpsPwaInstallNudgeMail::class, function (OpsPwaInstallNudgeMail $mail) use ($owner) {
            return $mail->hasTo($owner->email)
                && str_contains($mail->loginUrl, '/ops/login')
                && str_contains($mail->loginUrl, 'pwa=1');
        });
        $this->assertNotNull($owner->fresh()->ops_pwa_nudge_sent_at);

        Mail::fake();
        $this->assertFalse($service->sendForOwner($owner->fresh()));
        Mail::assertNothingSent();

        $other = User::where('email', 'owner@khayaos.com')->firstOrFail();
        $other->ops_pwa_nudge_sent_at = null;
        $other->pwa_installed_at = now();
        $other->save();

        Mail::fake();
        $this->assertFalse($service->sendForOwner($other->fresh()));
        Mail::assertNothingSent();
    }

    public function test_existing_wave_is_scheduled_once_then_emails_owners_without_ops_pwa(): void
    {
        Queue::fake();
        Mail::fake();
        $service = app(OpsPwaInstallNudgeService::class);

        $first = $service->scheduleExistingOwnersWave();
        $this->assertTrue($first['scheduled']);
        $this->assertSame(480, $first['delay_seconds']);
        Queue::assertPushed(ScheduleExistingOwnerOpsPwaNudgesJob::class);

        $again = $service->scheduleExistingOwnersWave();
        $this->assertFalse($again['scheduled']);

        $owner = User::where('email', 'owner@khayaos.com')->firstOrFail();
        $this->assertNull($owner->pwa_installed_at);

        $result = $service->sendExistingOwnersWave();
        $this->assertSame(1, $result['sent']);
        Mail::assertSent(OpsPwaInstallNudgeMail::class);
        $this->assertNotNull($owner->fresh()->ops_pwa_nudge_sent_at);

        Mail::fake();
        $second = $service->sendExistingOwnersWave();
        $this->assertSame(0, $second['sent']);
        Mail::assertNothingSent();
    }

    public function test_nudge_skips_when_another_staff_member_already_installed_ops_pwa(): void
    {
        Mail::fake();
        $owner = User::where('email', 'owner@khayaos.com')->firstOrFail();
        $tenant = Tenant::where('slug', 'pilot')->firstOrFail();

        User::create([
            'tenant_id' => $tenant->id,
            'name' => 'Chef Installed',
            'email' => 'chef.pwa@example.test',
            'password' => 'password123',
            'role' => 'kitchen',
            'status' => 'active',
            'email_verified_at' => now(),
            'pwa_installed_at' => now(),
        ]);

        $this->assertFalse(app(OpsPwaInstallNudgeService::class)->sendForOwner($owner));
        Mail::assertNothingSent();
    }
}
