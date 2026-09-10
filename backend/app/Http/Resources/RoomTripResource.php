<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class RoomTripResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'room_id' => $this->room_id,
            'origin_name' => $this->origin_name,
            'origin_latitude' => $this->origin_latitude,
            'origin_longitude' => $this->origin_longitude,
            'destination_name' => $this->destination_name,
            'destination_latitude' => $this->destination_latitude,
            'destination_longitude' => $this->destination_longitude,
            'vehicle_type' => $this->vehicle_type,
            'use_tolls' => $this->use_tolls,
            'vehicle_count' => $this->vehicle_count,
            'route_distance_km' => $this->route_distance_km,
            'route_duration_min' => $this->route_duration_min,
            'created_at' => $this->created_at?->toISOString(),
            'updated_at' => $this->updated_at?->toISOString(),
        ];
    }
}
