<?php

namespace App\Events;

use App\Models\SosAlert;
use Illuminate\Broadcasting\InteractsWithSockets;
use Illuminate\Broadcasting\PrivateChannel;
use Illuminate\Contracts\Broadcasting\ShouldBroadcastNow;
use Illuminate\Foundation\Events\Dispatchable;
use Illuminate\Queue\SerializesModels;

class SosAlertResolved implements ShouldBroadcastNow
{
    use Dispatchable, InteractsWithSockets, SerializesModels;

    public function __construct(public SosAlert $sosAlert) {}

    public function broadcastAs(): string
    {
        return 'sos.alert.resolved';
    }

    public function broadcastOn(): array
    {
        return [new PrivateChannel("tour-session.{$this->sosAlert->tour_session_id}")];
    }

    public function broadcastWith(): array
    {
        return [
            'session_id' => $this->sosAlert->tour_session_id,
            'sos_alert_id' => $this->sosAlert->id,
            'user_id' => $this->sosAlert->user_id,
            'status' => $this->sosAlert->status,
            'resolved_by_user_id' => $this->sosAlert->resolved_by_user_id,
            'resolved_at' => $this->sosAlert->resolved_at?->toISOString(),
        ];
    }
}
