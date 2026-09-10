<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class TripHistoryDetailResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        $member = $this->members->firstWhere('user_id', $request->user()->id);
        $startedAt = $this->started_at;
        $finishedAt = $this->finished_at;

        return [
            'session' => [
                'id' => $this->id,
                'room_id' => $this->room_id,
                'started_by_user_id' => $this->started_by_user_id,
                'status' => $this->status,
                'started_at' => $startedAt?->toISOString(),
                'finished_at' => $finishedAt?->toISOString(),
                'duration_seconds' => $startedAt && $finishedAt ? $startedAt->diffInSeconds($finishedAt) : null,
                'user_role' => $member?->role,
            ],
            'room' => new RoomResource($this->whenLoaded('room')),
            'trip' => $this->room?->relationLoaded('trip') ? new RoomTripResource($this->room->trip) : null,
            'members' => TourSessionMemberResource::collection($this->whenLoaded('members')),
            'member_count' => $this->members_count ?? $this->members->count(),
        ];
    }
}
