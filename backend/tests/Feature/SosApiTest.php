<?php

namespace Tests\Feature;

use App\Events\SosAlertResolved;
use App\Events\SosAlertTriggered;
use App\Models\Room;
use App\Models\SosAlert;
use App\Models\TourSession;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Event;
use Illuminate\Support\Facades\Hash;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class SosApiTest extends TestCase
{
    use RefreshDatabase;

    public function test_active_member_can_trigger_sos(): void
    {
        [$session, $host] = $this->sessionWithHost();
        Sanctum::actingAs($host);

        $this->postJson("/api/tour-sessions/{$session->id}/sos", $this->sosPayload())
            ->assertCreated()
            ->assertJsonPath('message', 'SOS triggered successfully')
            ->assertJsonPath('sos_alert.user_id', $host->id)
            ->assertJsonPath('sos_alert.status', 'active');
    }

    public function test_non_member_is_rejected(): void
    {
        [$session] = $this->sessionWithHost();
        Sanctum::actingAs($this->user('stranger@example.com'));

        $this->postJson("/api/tour-sessions/{$session->id}/sos", $this->sosPayload())->assertForbidden();
    }

    public function test_finished_session_is_rejected(): void
    {
        [$session, $host, $room] = $this->sessionWithHost();
        Sanctum::actingAs($host);
        $this->postJson("/api/rooms/{$room->id}/close")->assertOk();

        $this->postJson("/api/tour-sessions/{$session->id}/sos", $this->sosPayload())->assertUnprocessable();
    }

    public function test_duplicate_active_sos_is_rejected(): void
    {
        [$session, $host] = $this->sessionWithHost();
        Sanctum::actingAs($host);

        $this->postJson("/api/tour-sessions/{$session->id}/sos", $this->sosPayload())->assertCreated();
        $this->postJson("/api/tour-sessions/{$session->id}/sos", $this->sosPayload())->assertUnprocessable();
    }

    public function test_trigger_saves_database(): void
    {
        [$session, $host] = $this->sessionWithHost();
        Sanctum::actingAs($host);

        $this->postJson("/api/tour-sessions/{$session->id}/sos", $this->sosPayload())->assertCreated();

        $this->assertDatabaseHas('sos_alerts', [
            'tour_session_id' => $session->id,
            'user_id' => $host->id,
            'status' => 'active',
            'message' => 'Butuh bantuan',
        ]);
    }

    public function test_sos_alert_triggered_event_is_dispatched(): void
    {
        [$session, $host] = $this->sessionWithHost();
        Event::fake([SosAlertTriggered::class]);
        Sanctum::actingAs($host);

        $this->postJson("/api/tour-sessions/{$session->id}/sos", $this->sosPayload())->assertCreated();

        Event::assertDispatched(SosAlertTriggered::class, fn (SosAlertTriggered $event) =>
            $event->sosAlert->tour_session_id === $session->id
                && $event->sosAlert->user_id === $host->id
                && $event->sosAlert->status === 'active'
        );
    }

    public function test_sender_can_resolve_sos(): void
    {
        [$session, $host] = $this->sessionWithHost();
        Sanctum::actingAs($host);
        $sosId = $this->postJson("/api/tour-sessions/{$session->id}/sos", $this->sosPayload())->json('sos_alert.id');

        $this->postJson("/api/tour-sessions/{$session->id}/sos/{$sosId}/resolve")
            ->assertOk()
            ->assertJsonPath('sos_alert.status', 'resolved')
            ->assertJsonPath('sos_alert.resolved_by_user_id', $host->id);
    }

    public function test_host_can_resolve_sos(): void
    {
        [$session, $host, $room] = $this->sessionWithHost();
        $member = $this->user('member@example.com');
        Sanctum::actingAs($member);
        $this->postJson('/api/rooms/join', ['room_pin' => $room->room_pin])->assertOk();
        $sosId = $this->postJson("/api/tour-sessions/{$session->id}/sos", $this->sosPayload())->json('sos_alert.id');

        Sanctum::actingAs($host);
        $this->postJson("/api/tour-sessions/{$session->id}/sos/{$sosId}/resolve")
            ->assertOk()
            ->assertJsonPath('sos_alert.resolved_by_user_id', $host->id);
    }

    public function test_other_member_cannot_resolve_sos(): void
    {
        [$session, , $room] = $this->sessionWithHost();
        $sender = $this->user('sender@example.com');
        $other = $this->user('other@example.com');

        Sanctum::actingAs($sender);
        $this->postJson('/api/rooms/join', ['room_pin' => $room->room_pin])->assertOk();
        $sosId = $this->postJson("/api/tour-sessions/{$session->id}/sos", $this->sosPayload())->json('sos_alert.id');

        Sanctum::actingAs($other);
        $this->postJson('/api/rooms/join', ['room_pin' => $room->room_pin])->assertOk();
        $this->postJson("/api/tour-sessions/{$session->id}/sos/{$sosId}/resolve")->assertForbidden();
    }

    public function test_sos_alert_resolved_event_is_dispatched(): void
    {
        [$session, $host] = $this->sessionWithHost();
        Sanctum::actingAs($host);
        $sosId = $this->postJson("/api/tour-sessions/{$session->id}/sos", $this->sosPayload())->json('sos_alert.id');
        Event::fake([SosAlertResolved::class]);

        $this->postJson("/api/tour-sessions/{$session->id}/sos/{$sosId}/resolve")->assertOk();

        Event::assertDispatched(SosAlertResolved::class, fn (SosAlertResolved $event) =>
            $event->sosAlert->id === $sosId
                && $event->sosAlert->status === 'resolved'
                && $event->sosAlert->resolved_by_user_id === $host->id
        );
    }

    public function test_event_payloads_are_correct(): void
    {
        [$session, $host] = $this->sessionWithHost();
        Sanctum::actingAs($host);
        $sosId = $this->postJson("/api/tour-sessions/{$session->id}/sos", $this->sosPayload())->json('sos_alert.id');
        $sosAlert = SosAlert::with('user.profile')->findOrFail($sosId);

        $triggered = new SosAlertTriggered($sosAlert);
        $triggerPayload = $triggered->broadcastWith();
        $this->assertSame('sos.alert.triggered', $triggered->broadcastAs());
        $this->assertSame($session->id, $triggerPayload['session_id']);
        $this->assertSame($sosId, $triggerPayload['sos_alert_id']);
        $this->assertSame($host->id, $triggerPayload['user_id']);
        $this->assertSame('Rider', $triggerPayload['display_name']);
        $this->assertSame('Butuh bantuan', $triggerPayload['message']);
        $this->assertSame(-6.2088, $triggerPayload['latitude']);
        $this->assertSame(106.8456, $triggerPayload['longitude']);

        $this->postJson("/api/tour-sessions/{$session->id}/sos/{$sosId}/resolve")->assertOk();
        $resolved = new SosAlertResolved($sosAlert->refresh());
        $resolvePayload = $resolved->broadcastWith();
        $this->assertSame('sos.alert.resolved', $resolved->broadcastAs());
        $this->assertSame($session->id, $resolvePayload['session_id']);
        $this->assertSame($sosId, $resolvePayload['sos_alert_id']);
        $this->assertSame($host->id, $resolvePayload['user_id']);
        $this->assertSame('resolved', $resolvePayload['status']);
        $this->assertSame($host->id, $resolvePayload['resolved_by_user_id']);
        $this->assertNotNull($resolvePayload['resolved_at']);
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

    private function sosPayload(): array
    {
        return [
            'message' => 'Butuh bantuan',
            'latitude' => -6.2088,
            'longitude' => 106.8456,
        ];
    }
}
