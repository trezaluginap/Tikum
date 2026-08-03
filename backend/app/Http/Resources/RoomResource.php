<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class RoomResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'room_pin' => $this->room_pin,
            'host_user_id' => $this->host_user_id,
            'status' => $this->status,
            'closed_at' => $this->closed_at?->toISOString(),
            'trip' => new RoomTripResource($this->whenLoaded('trip')),
            'room_trips' => new RoomTripResource($this->whenLoaded('trip')),
            'members' => RoomMemberResource::collection($this->whenLoaded('members')),
            'session' => new TourSessionResource($this->whenLoaded('activeSession')),
            'created_at' => $this->created_at?->toISOString(),
            'updated_at' => $this->updated_at?->toISOString(),
        ];
    }
}
