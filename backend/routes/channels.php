<?php

use App\Models\TourSession;
use Illuminate\Support\Facades\Broadcast;

Broadcast::resolveAuthenticatedUserUsing(fn ($request) => $request->user('sanctum') ?: $request->user());

Broadcast::channel('tour-session.{sessionId}', function ($user, string $sessionId) {
    $user ??= auth('sanctum')->user();

    return $user && TourSession::whereKey($sessionId)
        ->where('status', 'active')
        ->whereHas('members', fn ($query) => $query
            ->where('user_id', $user->id)
            ->where('status', 'active'))
        ->exists();
});
