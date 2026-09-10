<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class RoomTrip extends Model
{
    use HasFactory, HasUuids;

    protected $fillable = [
        'room_id',
        'origin_name',
        'origin_latitude',
        'origin_longitude',
        'destination_name',
        'destination_latitude',
        'destination_longitude',
        'vehicle_type',
        'use_tolls',
        'vehicle_count',
        'route_distance_km',
        'route_duration_min',
    ];

    protected function casts(): array
    {
        return [
            'origin_latitude' => 'float',
            'origin_longitude' => 'float',
            'destination_latitude' => 'float',
            'destination_longitude' => 'float',
            'use_tolls' => 'boolean',
            'route_distance_km' => 'float',
            'route_duration_min' => 'integer',
            'vehicle_count' => 'integer',
        ];
    }

    public function room(): BelongsTo
    {
        return $this->belongsTo(Room::class);
    }
}
