<?php

namespace Tests\Feature;

use App\Modules\Auth\Domain\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;
use Tests\TestCase;

class PlatformAuditLogPaginationTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        $this->seed();
    }

    public function test_platform_audit_logs_are_paginated(): void
    {
        $admin = User::where('email', 'admin@khayaos.com')->firstOrFail();
        $token = $admin->createToken('test')->plainTextToken;

        $existing = DB::table('audit_logs')->count();
        for ($i = 0; $i < 30; $i++) {
            DB::table('audit_logs')->insert([
                'id' => (string) Str::uuid(),
                'tenant_id' => null,
                'user_id' => $admin->id,
                'action' => 'test.audit.'.$i,
                'entity_type' => 'test',
                'entity_id' => null,
                'metadata' => json_encode(['i' => $i]),
                'reason' => null,
                'created_at' => now()->addDays(2)->subSeconds($i)->toDateTimeString(),
            ]);
        }

        $expectedTotal = $existing + 30;
        $expectedLastPage = (int) ceil($expectedTotal / 10);

        $page1 = $this->getJson('/api/v1/platform/audit-logs?page=1&per_page=10', [
            'Authorization' => "Bearer {$token}",
        ]);
        $page1->assertOk();
        $page1->assertJsonPath('meta.current_page', 1);
        $page1->assertJsonPath('meta.per_page', 10);
        $page1->assertJsonPath('meta.total', $expectedTotal);
        $page1->assertJsonPath('meta.last_page', $expectedLastPage);
        $this->assertCount(10, $page1->json('logs'));

        $page2 = $this->getJson('/api/v1/platform/audit-logs?page=2&per_page=10', [
            'Authorization' => "Bearer {$token}",
        ]);
        $page2->assertOk();
        $page2->assertJsonPath('meta.current_page', 2);
        $this->assertCount(10, $page2->json('logs'));

        $page1Ids = collect($page1->json('logs'))->pluck('id');
        $page2Ids = collect($page2->json('logs'))->pluck('id');
        $this->assertCount(0, $page1Ids->intersect($page2Ids));
        $this->assertTrue(
            collect($page1->json('logs'))->contains(fn ($log) => str_starts_with($log['action'], 'test.audit.')),
            'Expected newest page to include inserted test audit rows',
        );
    }
}
