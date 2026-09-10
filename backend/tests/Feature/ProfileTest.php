<?php

namespace Tests\Feature;

use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class ProfileTest extends TestCase
{
    use RefreshDatabase;

    public function test_user_can_get_profile(): void
    {
        $token = $this->registerToken();

        $this->withHeader('Authorization', "Bearer {$token}")
            ->getJson('/api/profile')
            ->assertOk()
            ->assertJsonPath('profile.display_name', 'Rider One')
            ->assertJsonPath('profile.vehicle_name', 'Vario 160');
    }

    public function test_user_can_update_profile(): void
    {
        $token = $this->registerToken();

        $this->withHeader('Authorization', "Bearer {$token}")
            ->putJson('/api/profile', [
                'display_name' => 'Rider Updated',
                'vehicle_name' => 'ADV 160',
                'phone_number' => '08123456789',
                'bio' => 'Touring weekend',
            ])
            ->assertOk()
            ->assertJsonPath('message', 'Profile updated successfully')
            ->assertJsonPath('profile.display_name', 'Rider Updated')
            ->assertJsonPath('profile.phone_number', '08123456789');

        $this->assertDatabaseHas('profiles', [
            'display_name' => 'Rider Updated',
            'vehicle_name' => 'ADV 160',
            'phone_number' => '08123456789',
        ]);
    }

    public function test_profile_requires_token(): void
    {
        $this->getJson('/api/profile')->assertUnauthorized();
        $this->putJson('/api/profile', [])->assertUnauthorized();
    }

    public function test_display_name_is_required(): void
    {
        $token = $this->registerToken();

        $this->withHeader('Authorization', "Bearer {$token}")
            ->putJson('/api/profile', [
                'display_name' => '',
                'vehicle_name' => 'ADV 160',
            ])
            ->assertUnprocessable()
            ->assertJsonValidationErrors(['display_name']);
    }

    public function test_user_cannot_update_other_user_profile(): void
    {
        $token = $this->registerToken('one@example.com', 'Rider One');
        $this->registerToken('two@example.com', 'Rider Two');

        $otherProfileId = User::where('email', 'two@example.com')->firstOrFail()->profile->id;

        $this->withHeader('Authorization', "Bearer {$token}")
            ->putJson('/api/profile', [
                'user_id' => $otherProfileId,
                'display_name' => 'Hijack Attempt',
                'vehicle_name' => 'ADV 160',
            ])
            ->assertOk()
            ->assertJsonPath('profile.display_name', 'Hijack Attempt');

        $this->assertDatabaseHas('profiles', [
            'id' => $otherProfileId,
            'display_name' => 'Rider Two',
        ]);

        $this->assertDatabaseMissing('profiles', [
            'id' => $otherProfileId,
            'display_name' => 'Hijack Attempt',
        ]);
    }

    private function registerToken(string $email = 'rider@example.com', string $displayName = 'Rider One'): string
    {
        return $this->postJson('/api/register', [
            'email' => $email,
            'password' => 'password123',
            'display_name' => $displayName,
            'vehicle_name' => 'Vario 160',
            'device_name' => 'test-device',
        ])->assertCreated()->json('token');
    }
}
