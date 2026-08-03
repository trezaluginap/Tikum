<?php

namespace App\Events;

use App\Models\Room;
use App\Models\TourSession;
use Illuminate\Broadcasting\InteractsWithSockets;
use Illuminate\Broadcasting\PrivateChannel;
use Illuminate\Contracts\Broadcasting\ShouldBroadcastNow;
use Illuminate\Foundation\Events\Dispatchable;
use Illuminate\Queue\SerializesModels;

class RoomClosed implements ShouldBroadcastNow
{
    use Dispatchable, InteractsWithSockets, SerializesModels;

    public function __construct(
        public Room $room,
        public TourSession $session,
        public string $closedByUserId,
    ) {}

    public function broadcastAs(): string
    {
        return 'room.closed';
    }

    public function broadcastOn(): array
    {
        return [new PrivateChannel("tour-session.{$this->session->id}")];
    }

    public function broadcastWith(): array
    {
        return [
            'room_id' => $this->room->id,
            'session_id' => $this->session->id,
            'closed_by_user_id' => $this->closedByUserId,
            'closed_at' => $this->room->closed_at?->toISOString(),
            'session_status' => $this->session->status,
        ];
    }
}
