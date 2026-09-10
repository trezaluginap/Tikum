<?php

namespace App\Events;

use App\Http\Resources\ProfileResource;
use App\Models\CurrentLocation;
use Illuminate\Broadcasting\InteractsWithSockets;
use Illuminate\Broadcasting\PrivateChannel;
use Illuminate\Contracts\Broadcasting\ShouldBroadcastNow;
use Illuminate\Foundation\Events\Dispatchable;
use Illuminate\Queue\SerializesModels;

class MemberLocationUpdated implements ShouldBroadcastNow
{
    use Dispatchable, InteractsWithSockets, SerializesModels;

    public function __construct(public CurrentLocation $location)
    {
        $this->location->loadMissing('user.profile');
    }

    public function broadcastAs(): string
    {
        return 'member.location.updated';
    }

    public function broadcastOn(): array
    {
        return [new PrivateChannel("tour-session.{$this->location->tour_session_id}")];
    }

    public function broadcastWith(): array
    {
        $profile = $this->location->user?->profile;

        return [
            'session_id' => $this->location->tour_session_id,
            'user_id' => $this->location->user_id,
            'display_name' => $profile?->display_name,
            'avatar_url' => $profile ? (new ProfileResource($profile))->toArray(request())['avatar_url'] : null,
            'latitude' => $this->location->latitude,
            'longitude' => $this->location->longitude,
            'heading' => $this->location->heading,
            'speed' => $this->location->speed,
            'accuracy' => $this->location->accuracy,
            'recorded_at' => $this->location->recorded_at?->toISOString(),
            'received_at' => $this->location->received_at?->toISOString(),
            'is_stale' => $this->location->received_at ? $this->location->received_at->lt(now()->subSeconds(60)) : true,
        ];
    }
}
