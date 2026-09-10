<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class SosAlertResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'tour_session_id' => $this->tour_session_id,
            'user_id' => $this->user_id,
            'status' => $this->status,
            'message' => $this->message,
            'latitude' => $this->latitude,
            'longitude' => $this->longitude,
            'triggered_at' => $this->triggered_at?->toISOString(),
            'resolved_at' => $this->resolved_at?->toISOString(),
            'resolved_by_user_id' => $this->resolved_by_user_id,
            'user' => $this->whenLoaded('user', fn () => [
                'id' => $this->user->id,
                'profile' => new ProfileResource($this->user->profile),
            ]),
            'created_at' => $this->created_at?->toISOString(),
            'updated_at' => $this->updated_at?->toISOString(),
        ];
    }
}
