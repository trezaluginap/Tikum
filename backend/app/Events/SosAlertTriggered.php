<?php

namespace App\Events;

use App\Http\Resources\ProfileResource;
use App\Models\SosAlert;
use Illuminate\Broadcasting\InteractsWithSockets;
use Illuminate\Broadcasting\PrivateChannel;
use Illuminate\Contracts\Broadcasting\ShouldBroadcastNow;
use Illuminate\Foundation\Events\Dispatchable;
use Illuminate\Queue\SerializesModels;

class SosAlertTriggered implements ShouldBroadcastNow
{
    use Dispatchable, InteractsWithSockets, SerializesModels;

    public function __construct(public SosAlert $sosAlert)
    {
        $this->sosAlert->loadMissing('user.profile');
    }

    public function broadcastAs(): string
    {
        return 'sos.alert.triggered';
    }

    public function broadcastOn(): array
    {
        return [new PrivateChannel("tour-session.{$this->sosAlert->tour_session_id}")];
    }

    public function broadcastWith(): array
    {
        $profile = $this->sosAlert->user?->profile;
        $profileData = $profile ? (new ProfileResource($profile))->toArray(request()) : [];

        return [
            'session_id' => $this->sosAlert->tour_session_id,
            'sos_alert_id' => $this->sosAlert->id,
            'user_id' => $this->sosAlert->user_id,
            'display_name' => $profileData['display_name'] ?? null,
            'avatar_url' => $profileData['avatar_url'] ?? null,
            'message' => $this->sosAlert->message,
            'latitude' => $this->sosAlert->latitude,
            'longitude' => $this->sosAlert->longitude,
            'triggered_at' => $this->sosAlert->triggered_at?->toISOString(),
        ];
    }
}
