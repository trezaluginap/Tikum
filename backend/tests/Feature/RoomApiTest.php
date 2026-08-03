<?php

namespace Tests\Feature;

use App\Http\Controllers\Api\RoomController;
use App\Models\Room;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Hash;
use Laravel\Sanctum\Sanctum;
use Mockery;
use Tests\TestCase;

class RoomApiTest extends TestCase
{
    use RefreshDatabase;

    public function test_create_room_successfully(): void
    {
        Sanctum::actingAs($this->user());

        $response = $this->postJson('/api/rooms', $this->roomPayload());

        $response->assertCreated()
            ->assertJsonPath('message', 'Room created successfully')
            ->assertJsonPath('room.status', 'active')
            ->assertJsonPath('trip.vehicle_count', 3)
            ->assertJsonPath('session.status', 'active')
            ->assertJsonCount(1, 'members');

        $this->assertDatabaseCount('rooms', 1);
        $this->assertDatabaseCount('room_members', 1);
        $this->assertDatabaseCount('room_trips', 1);
        $this->assertDatabaseCount('tour_sessions', 1);
        $this->assertDatabaseCount('tour_session_members', 1);
    }

    public function test_pin_collision_retries(): void
    {
        $oldHost = $this->user('old@example.com');
        Room::create(['room_pin' => '111111', 'host_user_id' => $oldHost->id, 'status' => 'active']);

        $controller = Mockery::mock(RoomController::class)->makePartial()->shouldAllowMockingProtectedMethods();
        $controller->shouldReceive('randomPin')->twice()->andReturn('111111', '222222');
        $this->app->instance(RoomController::class, $controller);

        Sanctum::actingAs($this->user());
        $this->postJson('/api/rooms', $this->roomPayload())
            ->assertCreated()
            ->assertJsonPath('room.room_pin', '222222');
    }

    public function test_join_room_successfully(): void
    {
        [$room] = $this->createRoomWithHost();

        Sanctum::actingAs($this->user('member@example.com'));
        $this->postJson('/api/rooms/join', ['room_pin' => $room->room_pin])
            ->assertOk()
            ->assertJsonPath('room.id', $room->id)
            ->assertJsonPath('trip.vehicle_count', 3)
            ->assertJsonCount(2, 'members');

        $this->assertDatabaseCount('room_members', 2);
        $this->assertDatabaseCount('tour_session_members', 2);
    }

    public function test_join_invalid_room_returns_404(): void
    {
        Sanctum::actingAs($this->user());
        $this->postJson('/api/rooms/join', ['room_pin' => '999999'])->assertNotFound();
    }

    public function test_join_closed_room_is_rejected(): void
    {
        [$room] = $this->createRoomWithHost();
        $room->update(['status' => 'closed', 'closed_at' => now()]);

        Sanctum::actingAs($this->user('member@example.com'));
        $this->postJson('/api/rooms/join', ['room_pin' => $room->room_pin])->assertUnprocessable();
    }

    public function test_duplicate_join_is_rejected(): void
    {
        [$room] = $this->createRoomWithHost();

        Sanctum::actingAs($this->user('member@example.com'));
        $this->postJson('/api/rooms/join', ['room_pin' => $room->room_pin])->assertOk();
        $this->postJson('/api/rooms/join', ['room_pin' => $room->room_pin])->assertUnprocessable();
    }

    public function test_member_can_leave_room(): void
    {
        [$room] = $this->createRoomWithHost();
        $member = $this->user('member@example.com');

        Sanctum::actingAs($member);
        $this->postJson('/api/rooms/join', ['room_pin' => $room->room_pin])->assertOk();
        $this->postJson("/api/rooms/{$room->id}/leave")->assertOk();

        $this->assertDatabaseHas('room_members', ['room_id' => $room->id, 'user_id' => $member->id, 'status' => 'left']);
        $this->assertDatabaseHas('tour_session_members', ['user_id' => $member->id, 'status' => 'left']);
    }

    public function test_host_cannot_leave_active_room(): void
    {
        [$room, $host] = $this->createRoomWithHost();

        Sanctum::actingAs($host);
        $this->postJson("/api/rooms/{$room->id}/leave")->assertUnprocessable();
    }

    public function test_host_can_close_room(): void
    {
        [$room, $host] = $this->createRoomWithHost();

        Sanctum::actingAs($host);
        $this->postJson("/api/rooms/{$room->id}/close")
            ->assertOk()
            ->assertJsonPath('message', 'Room closed successfully')
            ->assertJsonPath('room.status', 'closed');

        $this->assertDatabaseHas('rooms', ['id' => $room->id, 'status' => 'closed']);
        $this->assertDatabaseHas('tour_sessions', ['room_id' => $room->id, 'status' => 'finished']);
    }

    public function test_member_cannot_close_room(): void
    {
        [$room] = $this->createRoomWithHost();
        $member = $this->user('member@example.com');

        Sanctum::actingAs($member);
        $this->postJson('/api/rooms/join', ['room_pin' => $room->room_pin])->assertOk();
        $this->postJson("/api/rooms/{$room->id}/close")->assertForbidden();
    }

    public function test_non_member_cannot_access_room(): void
    {
        [$room] = $this->createRoomWithHost();

        Sanctum::actingAs($this->user('stranger@example.com'));
        $this->getJson("/api/rooms/{$room->id}")->assertForbidden();
        $this->getJson("/api/rooms/{$room->id}/members")->assertForbidden();
        $this->getJson("/api/rooms/{$room->id}/trip")->assertForbidden();
    }

    public function test_active_rooms_disappear_after_closed(): void
    {
        [$room, $host] = $this->createRoomWithHost();

        Sanctum::actingAs($host);
        $this->getJson('/api/rooms/active')->assertOk()->assertJsonCount(1, 'rooms');
        $this->postJson("/api/rooms/{$room->id}/close")->assertOk();
        $this->getJson('/api/rooms/active')->assertOk()->assertJsonCount(0, 'rooms');
    }

    private function createRoomWithHost(): array
    {
        $host = $this->user('host@example.com');
        Sanctum::actingAs($host);
        $roomId = $this->postJson('/api/rooms', $this->roomPayload())->json('room.id');

        return [Room::findOrFail($roomId), $host];
    }

    private function user(string $email = 'rider@example.com'): User
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
            'vehicle_count' => 3,
            'route_distance_km' => 150.5,
            'route_duration_min' => 180,
        ];
    }
}
