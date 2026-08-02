<?php

namespace Tests\Feature;

use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class AuthTest extends TestCase
{
    use RefreshDatabase;

    public function test_user_can_register_with_profile(): void
    {
        $response = $this->postJson('/api/register', [
            'email' => 'rider@example.com',
            'password' => 'password123',
            'display_name' => 'Rider One',
            'vehicle_name' => 'Vario 160',
            'device_name' => 'test-device',
        ]);

        $response->assertCreated()
            ->assertJsonPath('message', 'Registration successful')
            ->assertJsonStructure(['token', 'user' => ['id', 'email', 'profile' => ['id', 'display_name', 'vehicle_name']]]);

        $this->assertDatabaseHas('users', ['email' => 'rider@example.com']);
        $this->assertDatabaseHas('profiles', ['display_name' => 'Rider One', 'vehicle_name' => 'Vario 160']);
    }

    public function test_duplicate_email_is_rejected(): void
    {
        $this->postJson('/api/register', [
            'email' => 'rider@example.com',
            'password' => 'password123',
            'display_name' => 'Rider One',
            'vehicle_name' => 'Vario 160',
        ])->assertCreated();

        $this->postJson('/api/register', [
            'email' => 'rider@example.com',
            'password' => 'password123',
            'display_name' => 'Rider Two',
            'vehicle_name' => 'Beat',
        ])->assertUnprocessable()
            ->assertJsonValidationErrors(['email']);
    }

    public function test_user_can_login_access_me_and_logout(): void
    {
        $this->postJson('/api/register', [
            'email' => 'rider@example.com',
            'password' => 'password123',
            'display_name' => 'Rider One',
            'vehicle_name' => 'Vario 160',
        ])->assertCreated();

        $login = $this->postJson('/api/login', [
            'email' => 'rider@example.com',
            'password' => 'password123',
            'device_name' => 'test-device',
        ])->assertOk()
            ->assertJsonPath('message', 'Login successful');

        $token = $login->json('token');

        $this->withHeader('Authorization', "Bearer {$token}")
            ->getJson('/api/me')
            ->assertOk()
            ->assertJsonPath('user.email', 'rider@example.com')
            ->assertJsonPath('user.profile.display_name', 'Rider One');

        $this->withHeader('Authorization', "Bearer {$token}")
            ->postJson('/api/logout')
            ->assertOk()
            ->assertJsonPath('message', 'Logout successful');

        $this->assertDatabaseCount('personal_access_tokens', 1);
    }

    public function test_me_requires_valid_token(): void
    {
        $this->withHeader('Authorization', 'Bearer invalid-token')
            ->getJson('/api/me')
            ->assertUnauthorized();
    }

    public function test_bad_password_returns_401(): void
    {
        $this->postJson('/api/register', [
            'email' => 'rider@example.com',
            'password' => 'password123',
            'display_name' => 'Rider One',
            'vehicle_name' => 'Vario 160',
        ])->assertCreated();

        $this->postJson('/api/login', [
            'email' => 'rider@example.com',
            'password' => 'wrong-password',
        ])->assertUnauthorized();
    }
}
