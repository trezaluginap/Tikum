<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class CurrentLocationResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        $profile = $this->user?->profile;

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
            'updated_at' => $this->updated_at?->toISOString(),
            'is_stale' => $this->received_at ? $this->received_at->lt(now()->subSeconds(60)) : true,
            'user' => $this->whenLoaded('user', fn () => [
                'id' => $this->user->id,
                'email' => $this->user->email,
                'profile' => $profile ? new ProfileResource($profile) : null,
            ]),
        ];
    }
}
