<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Relations\HasOne;

class Room extends Model
{
    use HasFactory, HasUuids;

    protected $fillable = [
        'room_pin',
        'host_user_id',
        'status',
        'closed_at',
    ];

    protected function casts(): array
    {
        return [
            'closed_at' => 'datetime',
        ];
    }

    public function host(): BelongsTo
    {
        return $this->belongsTo(User::class, 'host_user_id');
    }

    public function members(): HasMany
    {
        return $this->hasMany(RoomMember::class);
    }

    public function trip(): HasOne
    {
        return $this->hasOne(RoomTrip::class);
    }

    public function activeSession(): HasOne
    {
        return $this->hasOne(TourSession::class)->where('status', 'active');
    }

    public function sessions(): HasMany
    {
        return $this->hasMany(TourSession::class);
    }
}
