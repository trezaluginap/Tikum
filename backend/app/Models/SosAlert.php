<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class SosAlert extends Model
{
    use HasFactory, HasUuids;

    protected $fillable = [
        'tour_session_id',
        'user_id',
        'status',
        'message',
        'latitude',
        'longitude',
        'triggered_at',
        'resolved_at',
        'resolved_by_user_id',
    ];

    protected function casts(): array
    {
        return [
            'latitude' => 'float',
            'longitude' => 'float',
            'triggered_at' => 'datetime',
            'resolved_at' => 'datetime',
        ];
    }

    public function tourSession(): BelongsTo
    {
        return $this->belongsTo(TourSession::class);
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    public function resolvedBy(): BelongsTo
    {
        return $this->belongsTo(User::class, 'resolved_by_user_id');
    }
}
