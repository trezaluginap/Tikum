<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class StoreRoomRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'origin_name' => ['required', 'string', 'max:255'],
            'origin_latitude' => ['required', 'numeric', 'between:-90,90'],
            'origin_longitude' => ['required', 'numeric', 'between:-180,180'],
            'destination_name' => ['required', 'string', 'max:255'],
            'destination_latitude' => ['required', 'numeric', 'between:-90,90'],
            'destination_longitude' => ['required', 'numeric', 'between:-180,180'],
            'vehicle_type' => ['required', 'string', Rule::in(['motorcycle', 'car'])],
            'use_tolls' => ['nullable', 'boolean'],
            'vehicle_count' => ['required', 'integer', 'min:1', 'max:99'],
            'route_distance_km' => ['nullable', 'numeric', 'min:0'],
            'route_duration_min' => ['nullable', 'integer', 'min:0'],
        ];
    }
}
