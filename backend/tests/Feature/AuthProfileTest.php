<?php

namespace Tests\Feature;

use App\Modules\Auth\Domain\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Hash;
use Tests\TestCase;

class AuthProfileTest extends TestCase
{
    use RefreshDatabase;

    public function test_super_admin_can_login_with_tenant_slug_header(): void
    {
        $this->seed();

        $response = $this->postJson('/api/v1/auth/login', [
            'email' => 'admin@khayaos.com',
            'password' => 'password',
        ], [
            'X-Tenant-Slug' => 'pilot',
        ]);

        $response->assertOk();
        $response->assertJsonPath('user.role', 'super_admin');
        $response->assertJsonPath('user.tenant_id', null);
    }

    public function test_tenant_owner_can_update_email_with_current_password(): void
    {
        $this->seed();

        $owner = User::where('email', 'owner@khayaos.com')->firstOrFail();
        $token = $owner->createToken('test')->plainTextToken;

        $response = $this->patchJson('/api/v1/auth/email', [
            'email' => 'owner.new@khayaos.com',
            'current_password' => 'password',
        ], [
            'Authorization' => "Bearer {$token}",
            'X-Tenant-Slug' => 'pilot',
        ]);

        $response->assertOk();
        $response->assertJsonPath('user.email', 'owner.new@khayaos.com');
        $this->assertSame('owner.new@khayaos.com', $owner->fresh()->email);
    }

    public function test_tenant_owner_can_update_password_with_current_password(): void
    {
        $this->seed();

        $owner = User::where('email', 'owner@khayaos.com')->firstOrFail();
        $token = $owner->createToken('test')->plainTextToken;

        $response = $this->patchJson('/api/v1/auth/password', [
            'current_password' => 'password',
            'password' => 'new-password-123',
            'password_confirmation' => 'new-password-123',
        ], [
            'Authorization' => "Bearer {$token}",
            'X-Tenant-Slug' => 'pilot',
        ]);

        $response->assertOk();
        $this->assertTrue(Hash::check('new-password-123', $owner->fresh()->password));
    }

    public function test_super_admin_can_update_email(): void
    {
        $this->seed();

        $admin = User::where('email', 'admin@khayaos.com')->firstOrFail();
        $token = $admin->createToken('test')->plainTextToken;

        $response = $this->patchJson('/api/v1/auth/email', [
            'email' => 'admin.new@khayaos.com',
            'current_password' => 'password',
        ], [
            'Authorization' => "Bearer {$token}",
        ]);

        $response->assertOk();
        $response->assertJsonPath('user.email', 'admin.new@khayaos.com');
    }

    public function test_super_admin_can_update_password(): void
    {
        $this->seed();

        $admin = User::where('email', 'admin@khayaos.com')->firstOrFail();
        $token = $admin->createToken('test')->plainTextToken;

        $response = $this->patchJson('/api/v1/auth/password', [
            'current_password' => 'password',
            'password' => 'admin-new-pass-123',
            'password_confirmation' => 'admin-new-pass-123',
        ], [
            'Authorization' => "Bearer {$token}",
        ]);

        $response->assertOk();
        $this->assertTrue(Hash::check('admin-new-pass-123', $admin->fresh()->password));
    }

    public function test_update_email_fails_with_wrong_current_password(): void
    {
        $this->seed();

        $owner = User::where('email', 'owner@khayaos.com')->firstOrFail();
        $token = $owner->createToken('test')->plainTextToken;

        $response = $this->patchJson('/api/v1/auth/email', [
            'email' => 'owner.new@khayaos.com',
            'current_password' => 'wrong-password',
        ], [
            'Authorization' => "Bearer {$token}",
            'X-Tenant-Slug' => 'pilot',
        ]);

        $response->assertStatus(422);
        $response->assertJsonPath('code', 'VALIDATION_ERROR');
        $response->assertJsonPath('details.current_password.0', 'The current password is incorrect.');
    }

    public function test_update_email_fails_when_email_taken_in_tenant(): void
    {
        $this->seed();

        $owner = User::where('email', 'owner@khayaos.com')->firstOrFail();
        User::create([
            'tenant_id' => $owner->tenant_id,
            'name' => 'Other Staff',
            'email' => 'staff.duplicate@khayaos.com',
            'password' => 'password',
            'role' => 'staff',
            'status' => 'active',
        ]);
        $token = $owner->createToken('test')->plainTextToken;

        $response = $this->patchJson('/api/v1/auth/email', [
            'email' => 'staff.duplicate@khayaos.com',
            'current_password' => 'password',
        ], [
            'Authorization' => "Bearer {$token}",
            'X-Tenant-Slug' => 'pilot',
        ]);

        $response->assertStatus(422);
        $response->assertJsonPath('code', 'VALIDATION_ERROR');
        $response->assertJsonPath('details.email.0', 'Email already in use.');
    }
}
