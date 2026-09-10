<?php

namespace Tests\Feature;

use App\Events\MemberLocationUpdated;
use App\Models\Room;
use App\Models\TourSession;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Event;
use Illuminate\Support\Facades\Hash;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class ReverbLocationTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();

        config([
            'broadcasting.default' => 'reverb',
            'broadcasting.connections.reverb.key' => 'test-key',
            'broadcasting.connections.reverb.secret' => 'test-secret',
            'broadcasting.connections.reverb.app_id' => 'test-app',
        ]);
    }

    public function test_channel_auth_allows_active_member(): void
    {
        [$session, $host] = $this->sessionWithHost();
        $token = $host->createToken('test-device')->plainTextToken;

        $this->assertTrue(TourSession::whereKey($session->id)
            ->where('status', 'active')
            ->whereHas('members', fn ($query) => $query
                ->where('user_id', $host->id)
                ->where('status', 'active'))
            ->exists());

        $this->withToken($token)->getJson('/api/me')->assertOk();

        $response = $this->withToken($token)->postJson('/api/broadcasting/auth', [
            'socket_id' => '123.456',
            'channel_name' => "private-tour-session.{$session->id}",
        ]);

        $response->assertOk();
        $this->assertStringContainsString('"auth"', $response->getContent());
    }

    public function test_channel_auth_rejects_non_member(): void
    {
        [$session] = $this->sessionWithHost();
        $token = $this->user('stranger@example.com')->createToken('test-device')->plainTextToken;

        $this->withToken($token)->postJson('/api/broadcasting/auth', [
            'socket_id' => '123.456',
            'channel_name' => "private-tour-session.{$session->id}",
        ])->assertForbidden();
    }

    public function test_event_is_dispatched_after_location_update(): void
    {
        Event::fake([MemberLocationUpdated::class]);
        [$session, $host] = $this->sessionWithHost();
        Sanctum::actingAs($host);

        $this->postJson("/api/tour-sessions/{$session->id}/locations/current", $this->locationPayload())->assertOk();

        Event::assertDispatched(MemberLocationUpdated::class, fn (MemberLocationUpdated $event) => $event->location->tour_session_id === $session->id
            && $event->location->user_id === $host->id);
    }

    public function test_event_payload_is_correct(): void
    {
        Event::fake([MemberLocationUpdated::class]);
        [$session, $host] = $this->sessionWithHost();
        Sanctum::actingAs($host);
        $this->postJson("/api/tour-sessions/{$session->id}/locations/current", $this->locationPayload())->assertOk();

        $location = $session->currentLocations()->with('user.profile')->firstOrFail();
        $event = new MemberLocationUpdated($location);
        $payload = $event->broadcastWith();

        $this->assertSame("private-tour-session.{$session->id}", $event->broadcastOn()[0]->name);
        $this->assertSame('member.location.updated', $event->broadcastAs());
        $this->assertSame($session->id, $payload['session_id']);
        $this->assertSame($host->id, $payload['user_id']);
        $this->assertSame('Rider', $payload['display_name']);
        $this->assertSame(-6.2088, $payload['latitude']);
        $this->assertSame(106.8456, $payload['longitude']);
        $this->assertSame(90.0, $payload['heading']);
        $this->assertFalse($payload['is_stale']);
    }

    private function sessionWithHost(): array
    {
        $host = $this->user('host@example.com');
        $room = Room::create([
            'room_pin' => '123456',
            'host_user_id' => $host->id,
            'status' => 'active',
        ]);
        $room->members()->create([
            'user_id' => $host->id,
            'role' => 'host',
            'status' => 'active',
            'joined_at' => now(),
        ]);
        $room->trip()->create($this->roomPayload());
        $session = $room->sessions()->create([
            'started_by_user_id' => $host->id,
            'status' => 'active',
            'started_at' => now(),
        ]);
        $session->members()->create([
            'user_id' => $host->id,
            'role' => 'host',
            'status' => 'active',
            'joined_at' => now(),
        ]);

        return [$session, $host, $room];
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
