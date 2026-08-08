<?php

namespace Tests\Feature;

use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;
use Tests\TestCase;

class FlushWhatsAppQueueCommandTest extends TestCase
{
    use RefreshDatabase;

    public function test_dry_run_reports_whatsapp_jobs_without_deleting(): void
    {
        $this->seedJobs();

        $this->artisan('whatsapp:flush-queue', ['--dry-run' => true])
            ->expectsOutputToContain('Dry run only')
            ->assertSuccessful();

        $this->assertSame(2, DB::table('jobs')->count());
        $this->assertSame(1, DB::table('failed_jobs')->count());
    }

    public function test_force_flush_deletes_whatsapp_jobs_and_optional_failed(): void
    {
        $this->seedJobs();

        $this->artisan('whatsapp:flush-queue', [
            '--force' => true,
            '--failed' => true,
        ])->assertSuccessful();

        $this->assertSame(1, DB::table('jobs')->count());
        $remaining = (string) DB::table('jobs')->value('payload');
        $this->assertStringContainsString('SendOrderEmailNotificationJob', $remaining);
        $this->assertStringNotContainsString('SendWhatsAppMessageJob', $remaining);
        $this->assertSame(0, DB::table('failed_jobs')->count());
    }

    private function seedJobs(): void
    {
        DB::table('jobs')->insert([
            [
                'queue' => 'default',
                'payload' => $this->payloadFor('App\\Modules\\Notifications\\Jobs\\SendWhatsAppMessageJob'),
                'attempts' => 0,
                'reserved_at' => null,
                'available_at' => now()->getTimestamp(),
                'created_at' => now()->getTimestamp(),
            ],
            [
                'queue' => 'default',
                'payload' => $this->payloadFor('App\\Modules\\Notifications\\Jobs\\SendOrderEmailNotificationJob'),
                'attempts' => 0,
                'reserved_at' => null,
                'available_at' => now()->getTimestamp(),
                'created_at' => now()->getTimestamp(),
            ],
        ]);

        DB::table('failed_jobs')->insert([
            'uuid' => (string) Str::uuid(),
            'connection' => 'database',
            'queue' => 'default',
            'payload' => $this->payloadFor('App\\Modules\\Notifications\\Jobs\\SendSignupWelcomeWhatsAppJob'),
            'exception' => 'Genius quota',
            'failed_at' => now(),
        ]);
    }

    private function payloadFor(string $class): string
    {
        return json_encode([
            'uuid' => (string) Str::uuid(),
            'displayName' => $class,
            'job' => 'Illuminate\\Queue\\CallQueuedHandler@call',
            'data' => [
                'commandName' => $class,
                'command' => 'serialized',
            ],
        ], JSON_THROW_ON_ERROR);
    }
}
