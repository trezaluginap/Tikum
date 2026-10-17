<?php

namespace Tests\Feature;

use App\Models\LocationHistory;
use App\Models\Room;
use App\Models\TourSession;
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

    public function test_active_member_can_view_location_history(): void
    {
        [$session, $host] = $this->sessionWithHost();
        Sanctum::actingAs($host);

        $this->postJson("/api/tour-sessions/{$session->id}/locations/current", $this->locationPayload())->assertOk();

        $response = $this->getJson("/api/tour-sessions/{$session->id}/locations/history")
            ->assertOk()
            ->assertJsonStructure([
                'locations' => [
                    '*' => [
                        'id',
                        'tour_session_id',
                        'user_id',
                        'latitude',
                        'longitude',
                        'heading',
                        'speed',
                        'accuracy',
                        'recorded_at',
                        'received_at',
                    ],
                ],
                'meta' => ['current_page', 'per_page', 'total', 'last_page', 'has_more'],
            ]);

        $this->assertCount(1, $response->json('locations'));
        $this->assertSame($host->id, $response->json('locations.0.user_id'));
        $this->assertArrayNotHasKey('email', $response->json('locations.0'));
        $this->assertArrayNotHasKey('phone_number', $response->json('locations.0'));
    }

    public function test_empty_location_history_returns_200_with_empty_array(): void
    {
        [$session, $host] = $this->sessionWithHost();
        Sanctum::actingAs($host);

        $this->getJson("/api/tour-sessions/{$session->id}/locations/history")
            ->assertOk()
            ->assertJsonPath('locations', [])
            ->assertJsonPath('meta.total', 0);
    }

    public function test_non_member_cannot_view_location_history(): void
    {
        [$session] = $this->sessionWithHost('host-owner@example.com');
        $stranger = $this->user('stranger@example.com');
        Sanctum::actingAs($stranger);

        $this->getJson("/api/tour-sessions/{$session->id}/locations/history")->assertForbidden();
    }

    public function test_member_of_finished_session_can_view_location_history(): void
    {
        [$session, $host, $room] = $this->sessionWithHost();
        Sanctum::actingAs($host);

        $this->postJson("/api/tour-sessions/{$session->id}/locations/current", $this->locationPayload())->assertOk();
        $this->postJson("/api/rooms/{$room->id}/close")->assertOk();

        $this->assertSame('finished', $session->refresh()->status);

        $this->getJson("/api/tour-sessions/{$session->id}/locations/history")
            ->assertOk()
            ->assertJsonCount(1, 'locations');
    }

    public function test_location_history_can_be_filtered_by_user_id(): void
    {
        [$session, $host, $room] = $this->sessionWithHost('host-a@example.com');
        $member = $this->user('member-b@example.com');

        Sanctum::actingAs($member);
        $this->postJson('/api/rooms/join', ['room_pin' => $room->room_pin])->assertOk();

        Sanctum::actingAs($host);
        $this->postJson("/api/tour-sessions/{$session->id}/locations/current", $this->locationPayload())->assertOk();

        Sanctum::actingAs($member);
        $this->postJson("/api/tour-sessions/{$session->id}/locations/current", [
            ...$this->locationPayload(),
            'latitude' => -6.2100,
        ])->assertOk();

        $this->getJson("/api/tour-sessions/{$session->id}/locations/history?user_id={$member->id}")
            ->assertOk()
            ->assertJsonCount(1, 'locations')
            ->assertJsonPath('locations.0.user_id', $member->id);

        $this->getJson("/api/tour-sessions/{$session->id}/locations/history?user_id={$host->id}")
            ->assertOk()
            ->assertJsonCount(1, 'locations')
            ->assertJsonPath('locations.0.user_id', $host->id);
    }

    public function test_location_history_does_not_leak_across_sessions(): void
    {
        [$sessionOne, $hostOne] = $this->sessionWithHost('host-one-hist@example.com');
        [$sessionTwo, $hostTwo] = $this->sessionWithHost('host-two-hist@example.com');

        Sanctum::actingAs($hostOne);
        $this->postJson("/api/tour-sessions/{$sessionOne->id}/locations/current", $this->locationPayload())->assertOk();

        Sanctum::actingAs($hostTwo);
        $this->postJson("/api/tour-sessions/{$sessionTwo->id}/locations/current", [
            ...$this->locationPayload(),
            'latitude' => -7.1,
        ])->assertOk();

        Sanctum::actingAs($hostOne);
        $res = $this->getJson("/api/tour-sessions/{$sessionOne->id}/locations/history")->assertOk();
        $this->assertCount(1, $res->json('locations'));
        $this->assertSame($hostOne->id, $res->json('locations.0.user_id'));
    }

    public function test_location_history_pagination_and_validation(): void
    {
        [$session, $host] = $this->sessionWithHost();
        Sanctum::actingAs($host);

        $this->postJson("/api/tour-sessions/{$session->id}/locations/current", $this->locationPayload())->assertOk();

        $this->getJson("/api/tour-sessions/{$session->id}/locations/history?per_page=1")
            ->assertOk()
            ->assertJsonPath('meta.per_page', 1);

        $this->getJson("/api/tour-sessions/{$session->id}/locations/history?per_page=101")
            ->assertUnprocessable()
            ->assertJsonValidationErrors('per_page');

        $this->getJson("/api/tour-sessions/{$session->id}/locations/history?per_page=0")
            ->assertUnprocessable()
            ->assertJsonValidationErrors('per_page');
    }

    public function test_location_history_is_ordered_chronologically_ascending(): void
    {
        [$session, $host] = $this->sessionWithHost();
        Sanctum::actingAs($host);

        $this->postJson("/api/tour-sessions/{$session->id}/locations/current", [
            ...$this->locationPayload(),
            'latitude' => -6.2088,
        ])->assertOk();

        LocationHistory::first()->update(['received_at' => now()->subMinutes(5)]);

        $this->postJson("/api/tour-sessions/{$session->id}/locations/current", [
            ...$this->locationPayload(),
            'latitude' => -6.2200,
        ])->assertOk();

        $locations = $this->getJson("/api/tour-sessions/{$session->id}/locations/history")
            ->assertOk()
            ->json('locations');

        $this->assertCount(2, $locations);
        $t0 = strtotime($locations[0]['received_at']);
        $t1 = strtotime($locations[1]['received_at']);
        $this->assertLessThanOrEqual($t1, $t0);
    }

    public function test_history_default_per_page_is_fifty(): void
    {
        [$session, $host] = $this->sessionWithHost();
        Sanctum::actingAs($host);

        $this->getJson("/api/tour-sessions/{$session->id}/locations/history")
            ->assertOk()
            ->assertJsonPath('meta.per_page', 50);
    }

    public function test_history_empty_per_page_query_param_defaults_to_fifty(): void
    {
        [$session, $host] = $this->sessionWithHost();
        Sanctum::actingAs($host);

        $this->getJson("/api/tour-sessions/{$session->id}/locations/history?per_page=")
            ->assertOk()
            ->assertJsonPath('meta.per_page', 50);
    }

    public function test_history_per_page_upper_boundary_is_accepted(): void
    {
        [$session, $host] = $this->sessionWithHost();
        Sanctum::actingAs($host);

        $this->getJson("/api/tour-sessions/{$session->id}/locations/history?per_page=100")
            ->assertOk()
            ->assertJsonPath('meta.per_page', 100);
    }

    public function test_history_page_zero_returns_422(): void
    {
        [$session, $host] = $this->sessionWithHost();
        Sanctum::actingAs($host);

        $this->getJson("/api/tour-sessions/{$session->id}/locations/history?page=0")
            ->assertUnprocessable()
            ->assertJsonValidationErrors('page');
    }

    public function test_history_invalid_user_id_uuid_returns_422(): void
    {
        [$session, $host] = $this->sessionWithHost();
        Sanctum::actingAs($host);

        $this->getJson("/api/tour-sessions/{$session->id}/locations/history?user_id=not-a-uuid")
            ->assertUnprocessable()
            ->assertJsonValidationErrors('user_id');
    }

    public function test_history_user_id_from_another_session_returns_empty_not_leak(): void
    {
        [$session, $host] = $this->sessionWithHost('host-leak@example.com');
        [$otherSession, $otherHost] = $this->sessionWithHost('host-other-leak@example.com');

        Sanctum::actingAs($otherHost);
        $this->postJson("/api/tour-sessions/{$otherSession->id}/locations/current", $this->locationPayload())->assertOk();

        Sanctum::actingAs($host);
        $this->getJson("/api/tour-sessions/{$session->id}/locations/history?user_id={$otherHost->id}")
            ->assertOk()
            ->assertJsonPath('locations', [])
            ->assertJsonPath('meta.total', 0);
    }

    public function test_history_multi_page_meta_is_correct(): void
    {
        [$session, $host] = $this->sessionWithHost();
        Sanctum::actingAs($host);

        foreach ([-6.2088, -6.2090, -6.2100] as $index => $lat) {
            if ($index > 0) {
                LocationHistory::query()->update(['received_at' => now()->subMinutes(10 - $index)]);
            }
            $this->postJson("/api/tour-sessions/{$session->id}/locations/current", [
                ...$this->locationPayload(),
                'latitude' => $lat,
                'recorded_at' => now()->addSeconds($index * 10)->toISOString(),
            ])->assertOk();
        }

        $this->assertDatabaseCount('location_histories', 3);

        $pageOne = $this->getJson("/api/tour-sessions/{$session->id}/locations/history?per_page=2&page=1")
            ->assertOk()
            ->assertJsonCount(2, 'locations')
            ->assertJsonPath('meta.current_page', 1)
            ->assertJsonPath('meta.last_page', 2)
            ->assertJsonPath('meta.has_more', true)
            ->assertJsonPath('meta.total', 3);

        $this->getJson("/api/tour-sessions/{$session->id}/locations/history?per_page=2&page=2")
            ->assertOk()
            ->assertJsonCount(1, 'locations')
            ->assertJsonPath('meta.current_page', 2)
            ->assertJsonPath('meta.last_page', 2)
            ->assertJsonPath('meta.has_more', false)
            ->assertJsonPath('meta.total', 3);
    }

    public function test_history_ties_on_received_at_are_ordered_by_id_ascending(): void
    {
        [$session, $host] = $this->sessionWithHost();
        Sanctum::actingAs($host);

        $this->postJson("/api/tour-sessions/{$session->id}/locations/current", [
            ...$this->locationPayload(),
            'latitude' => -6.2088,
        ])->assertOk();
        $this->postJson("/api/tour-sessions/{$session->id}/locations/current", [
            ...$this->locationPayload(),
            'latitude' => -6.2200,
        ])->assertOk();

        $this->assertSame(2, LocationHistory::count());
        $sharedReceivedAt = now()->subMinutes(3);
        LocationHistory::query()->update(['received_at' => $sharedReceivedAt]);

        $locations = $this->getJson("/api/tour-sessions/{$session->id}/locations/history")
            ->assertOk()
            ->assertJsonCount(2, 'locations')
            ->json('locations');

        $ids = array_column($locations, 'id');
        $expected = LocationHistory::orderBy('id')->pluck('id')->map(fn ($id) => (string) $id)->all();
        $this->assertSame($expected, $ids);
    }

    public function test_left_member_can_still_view_location_history(): void
    {
        [$session, $host, $room] = $this->sessionWithHost('host-left-hist@example.com');
        $member = $this->user('member-left-hist@example.com');

        Sanctum::actingAs($member);
        $this->postJson('/api/rooms/join', ['room_pin' => $room->room_pin])->assertOk();

        Sanctum::actingAs($host);
        $this->postJson("/api/tour-sessions/{$session->id}/locations/current", $this->locationPayload())->assertOk();

        Sanctum::actingAs($member);
        $this->postJson("/api/rooms/{$room->id}/leave")->assertOk();
        $this->assertSame('left', $session->members()->where('user_id', $member->id)->value('status'));

        $this->getJson("/api/tour-sessions/{$session->id}/locations/history")
            ->assertOk()
            ->assertJsonCount(1, 'locations');
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
