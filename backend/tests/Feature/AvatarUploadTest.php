<?php

namespace Tests\Feature;

use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;
use Tests\TestCase;

class AvatarUploadTest extends TestCase
{
    use RefreshDatabase;

    public function test_user_can_upload_avatar(): void
    {
        Storage::fake('public');
        $token = $this->registerToken();

        $response = $this->withHeader('Authorization', "Bearer {$token}")
            ->postJson('/api/profile/avatar', [
                'avatar' => UploadedFile::fake()->image('avatar.jpg', 400, 400)->size(500),
            ])
            ->assertOk()
            ->assertJsonPath('message', 'Avatar uploaded successfully')
            ->assertJsonStructure(['avatar_url', 'profile' => ['avatar_path', 'avatar_url']]);

        $path = $response->json('profile.avatar_path');

        $this->assertStringStartsWith('avatars/', $path);
        $this->assertStringNotContainsString('file://', $path);
        Storage::disk('public')->assertExists($path);
        $this->assertDatabaseHas('profiles', ['avatar_path' => $path]);
    }

    public function test_avatar_upload_requires_token(): void
    {
        Storage::fake('public');

        $this->postJson('/api/profile/avatar', [
            'avatar' => UploadedFile::fake()->image('avatar.jpg'),
        ])->assertUnauthorized();
    }

    public function test_non_image_avatar_is_rejected(): void
    {
        Storage::fake('public');
        $token = $this->registerToken();

        $this->withHeader('Authorization', "Bearer {$token}")
            ->postJson('/api/profile/avatar', [
                'avatar' => UploadedFile::fake()->create('avatar.txt', 10, 'text/plain'),
            ])
            ->assertUnprocessable()
            ->assertJsonValidationErrors(['avatar']);
    }

    public function test_avatar_over_two_megabytes_is_rejected(): void
    {
        Storage::fake('public');
        $token = $this->registerToken();

        $this->withHeader('Authorization', "Bearer {$token}")
            ->postJson('/api/profile/avatar', [
                'avatar' => UploadedFile::fake()->image('avatar.jpg')->size(2049),
            ])
            ->assertUnprocessable()
            ->assertJsonValidationErrors(['avatar']);
    }

    public function test_old_avatar_is_deleted_after_new_upload(): void
    {
        Storage::fake('public');
        $token = $this->registerToken();

        $firstPath = $this->withHeader('Authorization', "Bearer {$token}")
            ->postJson('/api/profile/avatar', [
                'avatar' => UploadedFile::fake()->image('avatar.jpg', 400, 400)->size(500),
            ])
            ->assertOk()
            ->json('profile.avatar_path');

        $secondPath = $this->withHeader('Authorization', "Bearer {$token}")
            ->postJson('/api/profile/avatar', [
                'avatar' => UploadedFile::fake()->image('avatar.png', 400, 400)->size(500),
            ])
            ->assertOk()
            ->json('profile.avatar_path');

        $this->assertNotSame($firstPath, $secondPath);
        Storage::disk('public')->assertMissing($firstPath);
        Storage::disk('public')->assertExists($secondPath);
    }

    private function registerToken(): string
    {
        return $this->postJson('/api/register', [
            'email' => 'rider@example.com',
            'password' => 'password123',
            'display_name' => 'Rider One',
            'vehicle_name' => 'Vario 160',
            'device_name' => 'test-device',
        ])->assertCreated()->json('token');
    }
}
