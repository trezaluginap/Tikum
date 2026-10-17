<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class LocationHistoryResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'tour_session_id' => $this->tour_session_id,
            'user_id' => $this->user_id,
            'latitude' => $this->latitude,
            'longitude' => $this->longitude,
            'heading' => $this->heading,
            'speed' => $this->speed,
            'accuracy' => $this->accuracy,
            'recorded_at' => $this->recorded_at?->toISOString(),
            'received_at' => $this->received_at?->toISOString(),
        ];
    }
}
