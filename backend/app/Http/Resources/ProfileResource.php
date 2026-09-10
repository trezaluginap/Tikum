<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class ProfileResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'display_name' => $this->display_name,
            'vehicle_name' => $this->vehicle_name,
            'phone_number' => $this->phone_number,
            'bio' => $this->bio,
            'avatar_path' => $this->avatar_path,
            'avatar_url' => $this->avatar_path ? $request->getSchemeAndHttpHost().'/storage/'.$this->avatar_path : null,
            'created_at' => $this->created_at?->toISOString(),
            'updated_at' => $this->updated_at?->toISOString(),
        ];
    }
}
