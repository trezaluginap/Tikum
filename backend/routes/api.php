<?php

use App\Http\Controllers\Api\AuthController;
use App\Http\Controllers\Api\LocationController;
use App\Http\Controllers\Api\ProfileController;
use App\Http\Controllers\Api\RoomController;
use App\Http\Controllers\Api\SosController;
use App\Models\TourSession;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Route;

Route::get('/health', function () {
    return response()->json([
        'status' => 'ok',
        'message' => 'Tikum API is running',
    ]);
});

Route::post('/register', [AuthController::class, 'register']);
Route::post('/login', [AuthController::class, 'login']);

Route::middleware('auth:sanctum')->group(function () {
    Route::post('/broadcasting/auth', function (Request $request) {
        $data = $request->validate([
            'socket_id' => ['required', 'string'],
            'channel_name' => ['required', 'string'],
        ]);

        $prefix = 'private-tour-session.';
        abort_unless(str_starts_with($data['channel_name'], $prefix), 403);

        $sessionId = substr($data['channel_name'], strlen($prefix));
        $isMember = TourSession::whereKey($sessionId)
            ->where('status', 'active')
            ->whereHas('members', fn ($query) => $query
                ->where('user_id', $request->user()->id)
                ->where('status', 'active'))
            ->exists();

        abort_unless($isMember, 403);

        $key = config('broadcasting.connections.reverb.key');
        $secret = config('broadcasting.connections.reverb.secret');
        $signature = hash_hmac('sha256', $data['socket_id'].':'.$data['channel_name'], $secret);

        return response()->json(['auth' => $key.':'.$signature]);
    });
    Route::post('/logout', [AuthController::class, 'logout']);
    Route::get('/me', [AuthController::class, 'me']);
    Route::get('/profile', [ProfileController::class, 'show']);
    Route::put('/profile', [ProfileController::class, 'update']);
    Route::post('/profile/avatar', [ProfileController::class, 'uploadAvatar']);
    Route::get('/rooms/active', [RoomController::class, 'active']);
    Route::post('/rooms', [RoomController::class, 'store']);
    Route::post('/rooms/join', [RoomController::class, 'join']);
    Route::post('/rooms/{room}/leave', [RoomController::class, 'leave']);
    Route::post('/rooms/{room}/close', [RoomController::class, 'close']);
    Route::get('/rooms/{room}', [RoomController::class, 'show']);
    Route::get('/rooms/{room}/members', [RoomController::class, 'members']);
    Route::get('/rooms/{room}/trip', [RoomController::class, 'trip']);
    Route::get('/tour-sessions/{session}/locations/current', [LocationController::class, 'current']);
    Route::post('/tour-sessions/{session}/locations/current', [LocationController::class, 'update']);
    Route::post('/tour-sessions/{session}/sos', [SosController::class, 'trigger']);
    Route::post('/tour-sessions/{session}/sos/{sosAlert}/resolve', [SosController::class, 'resolve']);
});
