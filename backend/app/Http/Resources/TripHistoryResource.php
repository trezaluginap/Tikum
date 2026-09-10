<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class TripHistoryResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        $room = $this->room;
        $trip = $room?->trip;
        $member = $this->members->firstWhere('user_id', $request->user()->id);
        $startedAt = $this->started_at;
        $finishedAt = $this->finished_at;

        return [
            'session_id' => $this->id,
            'room_id' => $this->room_id,
            'room_pin' => $room?->room_pin,
            'status' => $this->status,
            'origin' => $trip ? [
                'name' => $trip->origin_name,
                'latitude' => $trip->origin_latitude,
                'longitude' => $trip->origin_longitude,
            ] : null,
            'destination' => $trip ? [
                'name' => $trip->destination_name,
                'latitude' => $trip->destination_latitude,
                'longitude' => $trip->destination_longitude,
            ] : null,
            'vehicle_type' => $trip?->vehicle_type,
            'use_tolls' => $trip?->use_tolls,
            'vehicle_count' => $trip?->vehicle_count,
            'started_at' => $startedAt?->toISOString(),
            'finished_at' => $finishedAt?->toISOString(),
            'duration_seconds' => $startedAt && $finishedAt ? $startedAt->diffInSeconds($finishedAt) : null,
            'member_count' => $this->members_count ?? $this->members->count(),
            'user_role' => $member?->role,
        ];
    }
}
