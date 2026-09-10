<?php

namespace Tests\Feature;

use App\Models\Room;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Hash;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class HistoryApiTest extends TestCase
{
    use RefreshDatabase;

    public function test_host_can_see_own_trip_history(): void
    {
        [$room, $host] = $this->finishedRoom();

        Sanctum::actingAs($host);
        $this->getJson('/api/history/trips')
            ->assertOk()
            ->assertJsonCount(1, 'trips')
            ->assertJsonPath('trips.0.room_id', $room->id)
            ->assertJsonPath('trips.0.user_role', 'host');
    }

    public function test_member_can_see_joined_trip_history(): void
    {
        [$room, , $member] = $this->finishedRoomWithMember();

        Sanctum::actingAs($member);
        $this->getJson('/api/history/trips')
            ->assertOk()
            ->assertJsonCount(1, 'trips')
            ->assertJsonPath('trips.0.room_id', $room->id)
            ->assertJsonPath('trips.0.user_role', 'member');
    }

    public function test_stranger_cannot_see_trip_detail(): void
    {
        [, , , $session] = $this->finishedRoomWithMember();

        Sanctum::actingAs($this->user('stranger@example.com'));
        $this->getJson("/api/history/trips/{$session->id}")->assertForbidden();
    }

    public function test_active_session_does_not_appear(): void
    {
        [, $host] = $this->createRoomWithHost();

        Sanctum::actingAs($host);
        $this->getJson('/api/history/trips')
            ->assertOk()
            ->assertJsonCount(0, 'trips');
    }

    public function test_finished_session_appears(): void
    {
        $this->finishedRoom();

        Sanctum::actingAs(User::where('email', 'host@example.com')->firstOrFail());
        $this->getJson('/api/history/trips')
            ->assertOk()
            ->assertJsonCount(1, 'trips')
            ->assertJsonPath('trips.0.status', 'finished');
    }

    public function test_pagination_works(): void
    {
        $host = $this->user('host@example.com');

        for ($i = 0; $i < 3; $i++) {
            $this->finishedRoomForHost($host, "host{$i}@example.com");
        }

        Sanctum::actingAs($host);
        $this->getJson('/api/history/trips?per_page=2')
            ->assertOk()
            ->assertJsonCount(2, 'trips')
            ->assertJsonPath('meta.per_page', 2)
            ->assertJsonPath('meta.total', 3)
            ->assertJsonPath('meta.has_more', true);
    }

    public function test_role_filter_works(): void
    {
        [$hostRoom, $host] = $this->finishedRoom();
        [$memberRoom] = $this->finishedRoomForJoinedMember($host, 'other-host@example.com');

        Sanctum::actingAs($host);
        $this->getJson('/api/history/trips?role=host')
            ->assertOk()
            ->assertJsonCount(1, 'trips')
            ->assertJsonPath('trips.0.room_id', $hostRoom->id);

        $this->getJson('/api/history/trips?role=member')
            ->assertOk()
            ->assertJsonCount(1, 'trips')
            ->assertJsonPath('trips.0.room_id', $memberRoom->id);
    }

    public function test_member_count_is_correct(): void
    {
        [, $host, , $session] = $this->finishedRoomWithMember();

        Sanctum::actingAs($host);
        $this->getJson("/api/history/trips/{$session->id}")
            ->assertOk()
            ->assertJsonPath('trip.member_count', 2)
            ->assertJsonPath('trip.trip.vehicle_count', 3)
            ->assertJsonPath('trip.trip.origin_name', 'Jakarta host@example.com')
            ->assertJsonCount(2, 'trip.members');
    }

    public function test_response_does_not_contain_encoded_vehicle_count(): void
    {
        $this->finishedRoom();

        Sanctum::actingAs(User::where('email', 'host@example.com')->firstOrFail());
        $this->getJson('/api/history/trips')
            ->assertOk()
            ->assertJsonPath('trips.0.vehicle_count', 3);
    }

    private function finishedRoomWithMember(): array
    {
        [$room, $host] = $this->createRoomWithHost();
        $member = $this->user('member@example.com');

        Sanctum::actingAs($member);
        $this->postJson('/api/rooms/join', ['room_pin' => $room->room_pin])->assertOk();

        Sanctum::actingAs($host);
        $this->postJson("/api/rooms/{$room->id}/close")->assertOk();

        return [$room->refresh(), $host, $member, $room->sessions()->firstOrFail()->refresh()];
    }

    private function finishedRoom(): array
    {
        [$room, $host] = $this->createRoomWithHost();

        Sanctum::actingAs($host);
        $this->postJson("/api/rooms/{$room->id}/close")->assertOk();

        return [$room->refresh(), $host, $room->sessions()->firstOrFail()->refresh()];
    }

    private function finishedRoomForHost(User $host, string $emailSuffix): array
    {
        Sanctum::actingAs($host);
        $roomId = $this->postJson('/api/rooms', $this->roomPayload($emailSuffix))->json('room.id');
        $room = Room::findOrFail($roomId);
        $this->postJson("/api/rooms/{$room->id}/close")->assertOk();

        return [$room->refresh(), $host, $room->sessions()->firstOrFail()->refresh()];
    }

    private function finishedRoomForJoinedMember(User $member, string $hostEmail): array
    {
        [$room, $host] = $this->createRoomWithHost($hostEmail);

        Sanctum::actingAs($member);
        $this->postJson('/api/rooms/join', ['room_pin' => $room->room_pin])->assertOk();

        Sanctum::actingAs($host);
        $this->postJson("/api/rooms/{$room->id}/close")->assertOk();

        return [$room->refresh(), $host, $room->sessions()->firstOrFail()->refresh()];
    }

    private function createRoomWithHost(string $email = 'host@example.com'): array
    {
        $host = User::where('email', $email)->first() ?? $this->user($email);
        Sanctum::actingAs($host);
        $roomId = $this->postJson('/api/rooms', $this->roomPayload($email))->json('room.id');

        return [Room::findOrFail($roomId), $host];
    }

    private function user(string $email): User
    {
        $user = User::create(['email' => $email, 'password' => Hash::make('password123')]);
        $user->profile()->create(['display_name' => 'Rider', 'vehicle_name' => 'Vario 160']);

        return $user;
    }

    private function roomPayload(string $suffix = 'main'): array
    {
        return [
            'origin_name' => 'Jakarta '.$suffix,
            'origin_latitude' => -6.2088,
            'origin_longitude' => 106.8456,
            'destination_name' => 'Bandung '.$suffix,
            'destination_latitude' => -6.9175,
            'destination_longitude' => 107.6191,
            'vehicle_type' => 'car',
            'use_tolls' => true,
            'vehicle_count' => 3,
            'route_distance_km' => 150.5,
            'route_duration_min' => 180,
        ];
    }
}
