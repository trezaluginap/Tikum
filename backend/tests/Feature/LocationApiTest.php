<?php

namespace Tests\Feature;

use App\Models\LocationHistory;
use App\Models\Room;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Hash;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class LocationApiTest extends TestCase
{
    use RefreshDatabase;

    public function test_active_member_can_update_location(): void
    {
        [$session, $host] = $this->sessionWithHost();
        Sanctum::actingAs($host);

        $this->postJson("/api/tour-sessions/{$session->id}/locations/current", $this->locationPayload())
            ->assertOk()
            ->assertJsonPath('message', 'Location updated successfully')
            ->assertJsonPath('location.user_id', $host->id)
            ->assertJsonPath('location.is_stale', false);

        $this->assertDatabaseHas('current_locations', ['tour_session_id' => $session->id, 'user_id' => $host->id]);
    }

    public function test_non_member_is_rejected(): void
    {
        [$session] = $this->sessionWithHost();
        Sanctum::actingAs($this->user('stranger@example.com'));

        $this->postJson("/api/tour-sessions/{$session->id}/locations/current", $this->locationPayload())->assertForbidden();
        $this->getJson("/api/tour-sessions/{$session->id}/locations/current")->assertForbidden();
    }

    public function test_left_member_is_rejected(): void
    {
        [$session, , $room] = $this->sessionWithHost();
        $member = $this->user('member@example.com');
        Sanctum::actingAs($member);
        $this->postJson('/api/rooms/join', ['room_pin' => $room->room_pin])->assertOk();
        $this->postJson("/api/rooms/{$room->id}/leave")->assertOk();

        $this->postJson("/api/tour-sessions/{$session->id}/locations/current", $this->locationPayload())->assertForbidden();
    }

    public function test_finished_session_is_rejected(): void
    {
        [$session, $host, $room] = $this->sessionWithHost();
        Sanctum::actingAs($host);
        $this->postJson("/api/rooms/{$room->id}/close")->assertOk();

        $this->postJson("/api/tour-sessions/{$session->id}/locations/current", $this->locationPayload())->assertUnprocessable();
    }

    public function test_invalid_coordinates_return_422(): void
    {
        [$session, $host] = $this->sessionWithHost();
        Sanctum::actingAs($host);

        $this->postJson("/api/tour-sessions/{$session->id}/locations/current", [
            ...$this->locationPayload(),
            'latitude' => -91,
        ])->assertUnprocessable()->assertJsonValidationErrors('latitude');
    }

    public function test_current_location_is_upserted(): void
    {
        [$session, $host] = $this->sessionWithHost();
        Sanctum::actingAs($host);

        $this->postJson("/api/tour-sessions/{$session->id}/locations/current", $this->locationPayload())->assertOk();
        $this->postJson("/api/tour-sessions/{$session->id}/locations/current", [
            ...$this->locationPayload(),
            'latitude' => -6.2090,
        ])->assertOk();

        $this->assertDatabaseCount('current_locations', 1);
        $this->assertDatabaseHas('current_locations', ['tour_session_id' => $session->id, 'user_id' => $host->id, 'latitude' => -6.2090]);
    }

    public function test_get_only_returns_locations_from_same_session(): void
    {
        [$session, $host] = $this->sessionWithHost('host-one@example.com');
        [$otherSession, $otherHost] = $this->sessionWithHost('host-two@example.com');

        Sanctum::actingAs($host);
        $this->postJson("/api/tour-sessions/{$session->id}/locations/current", $this->locationPayload())->assertOk();
        Sanctum::actingAs($otherHost);
        $this->postJson("/api/tour-sessions/{$otherSession->id}/locations/current", [
            ...$this->locationPayload(),
            'latitude' => -7,
        ])->assertOk();

        Sanctum::actingAs($host);
        $this->getJson("/api/tour-sessions/{$session->id}/locations/current")
            ->assertOk()
            ->assertJsonCount(1, 'locations')
            ->assertJsonPath('locations.0.user_id', $host->id)
            ->assertJsonPath('locations.0.user.profile.display_name', 'Rider');
    }

    public function test_is_stale_is_correct(): void
    {
        [$session, $host] = $this->sessionWithHost();
        Sanctum::actingAs($host);
        $this->postJson("/api/tour-sessions/{$session->id}/locations/current", $this->locationPayload())->assertOk();

        $session->currentLocations()->first()->update(['received_at' => now()->subSeconds(61)]);

        $this->getJson("/api/tour-sessions/{$session->id}/locations/current")
            ->assertOk()
            ->assertJsonPath('locations.0.is_stale', true);
    }

    public function test_history_is_not_saved_on_every_update(): void
    {
        [$session, $host] = $this->sessionWithHost();
        Sanctum::actingAs($host);

        $this->postJson("/api/tour-sessions/{$session->id}/locations/current", $this->locationPayload())->assertOk();
        $this->postJson("/api/tour-sessions/{$session->id}/locations/current", [
            ...$this->locationPayload(),
            'latitude' => -6.20881,
            'recorded_at' => now()->addSeconds(10)->toISOString(),
        ])->assertOk();

        $this->assertDatabaseCount('location_histories', 1);
    }

    public function test_history_is_saved_by_distance_or_time(): void
    {
        [$session, $host] = $this->sessionWithHost();
        Sanctum::actingAs($host);

        $this->postJson("/api/tour-sessions/{$session->id}/locations/current", $this->locationPayload())->assertOk();
        $this->postJson("/api/tour-sessions/{$session->id}/locations/current", [
            ...$this->locationPayload(),
            'latitude' => -6.2100,
            'recorded_at' => now()->addSeconds(10)->toISOString(),
        ])->assertOk();

        LocationHistory::query()->delete();
        $this->postJson("/api/tour-sessions/{$session->id}/locations/current", $this->locationPayload())->assertOk();
        LocationHistory::first()->update(['received_at' => now()->subSeconds(61)]);
        $this->postJson("/api/tour-sessions/{$session->id}/locations/current", [
            ...$this->locationPayload(),
            'recorded_at' => now()->addSeconds(70)->toISOString(),
        ])->assertOk();

        $this->assertDatabaseCount('location_histories', 2);
    }

    private function sessionWithHost(string $email = 'host@example.com'): array
    {
        $host = $this->user($email);
        Sanctum::actingAs($host);
        $roomId = $this->postJson('/api/rooms', $this->roomPayload())->json('room.id');
        $room = Room::findOrFail($roomId);

        return [$room->activeSession()->firstOrFail(), $host, $room];
    }

    private function user(string $email): User
    {
        $user = User::create(['email' => $email, 'password' => Hash::make('password123')]);
        $user->profile()->create(['display_name' => 'Rider', 'vehicle_name' => 'Vario 160']);

        return $user;
    }

    private function roomPayload(): array
    {
        return [
            'origin_name' => 'Jakarta',
            'origin_latitude' => -6.2088,
            'origin_longitude' => 106.8456,
            'destination_name' => 'Bandung',
            'destination_latitude' => -6.9175,
            'destination_longitude' => 107.6191,
            'vehicle_type' => 'car',
            'use_tolls' => true,
            'vehicle_count' => 2,
        ];
    }

    private function locationPayload(): array
    {
        return [
            'latitude' => -6.2088,
            'longitude' => 106.8456,
            'heading' => 90,
            'speed' => 12.5,
            'accuracy' => 15,
            'recorded_at' => now()->toISOString(),
        ];
    }
}
