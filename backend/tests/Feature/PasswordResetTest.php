<?php

namespace Tests\Feature;

use App\Models\User;
use Illuminate\Auth\Notifications\ResetPassword as ResetPasswordNotification;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Notification;
use Illuminate\Support\Facades\Password;
use Tests\TestCase;

class PasswordResetTest extends TestCase
{
    use RefreshDatabase;

    public function test_forgot_password_request_valid(): void
    {
        Notification::fake();
        $user = $this->user();

        $this->postJson('/api/forgot-password', ['email' => $user->email])
            ->assertOk()
            ->assertJsonPath('message', 'Link reset password sudah dikirim ke email terdaftar.');

        Notification::assertSentTo($user, ResetPasswordNotification::class);
    }

    public function test_unregistered_email_is_rejected(): void
    {
        Notification::fake();

        $this->postJson('/api/forgot-password', ['email' => 'missing@example.com'])
            ->assertUnprocessable()
            ->assertJsonValidationErrors('email')
            ->assertJsonPath('errors.email.0', 'Email tidak terdaftar.');

        Notification::assertNothingSent();
    }

    public function test_valid_reset_token_resets_password(): void
    {
        $user = $this->user();
        $token = Password::createToken($user);

        $this->postJson('/api/reset-password', [
            'email' => $user->email,
            'token' => $token,
            'password' => 'new-password123',
            'password_confirmation' => 'new-password123',
        ])->assertOk()
            ->assertJsonPath('message', 'Password berhasil direset.');

        $this->assertTrue(Hash::check('new-password123', $user->refresh()->password));
    }

    public function test_invalid_reset_token_is_rejected(): void
    {
        $user = $this->user();

        $this->postJson('/api/reset-password', [
            'email' => $user->email,
            'token' => 'invalid-token',
            'password' => 'new-password123',
            'password_confirmation' => 'new-password123',
        ])->assertUnprocessable()
            ->assertJsonValidationErrors('token')
            ->assertJsonPath('errors.token.0', 'Token reset password tidak valid atau sudah kedaluwarsa.');
    }

    public function test_invalid_password_confirmation_returns_422(): void
    {
        $user = $this->user();
        $token = Password::createToken($user);

        $this->postJson('/api/reset-password', [
            'email' => $user->email,
            'token' => $token,
            'password' => 'new-password123',
            'password_confirmation' => 'different-password123',
        ])->assertUnprocessable()
            ->assertJsonValidationErrors('password');
    }

    public function test_old_sanctum_tokens_are_deleted_after_reset(): void
    {
        $user = $this->user();
        $user->createToken('old-device');
        $token = Password::createToken($user);

        $this->assertDatabaseCount('personal_access_tokens', 1);

        $this->postJson('/api/reset-password', [
            'email' => $user->email,
            'token' => $token,
            'password' => 'new-password123',
            'password_confirmation' => 'new-password123',
        ])->assertOk();

        $this->assertDatabaseCount('personal_access_tokens', 0);
    }

    private function user(): User
    {
        $user = User::create([
            'email' => 'rider@example.com',
            'password' => Hash::make('password123'),
        ]);
        $user->profile()->create(['display_name' => 'Rider', 'vehicle_name' => 'Vario 160']);

        return $user;
    }
}
