<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\UpdateCurrentLocationRequest;
use App\Http\Resources\CurrentLocationResource;
use App\Models\CurrentLocation;
use App\Models\LocationHistory;
use App\Models\TourSession;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

class LocationController extends Controller
{
    public function current(Request $request, TourSession $session): JsonResponse
    {
        $this->authorizeActiveSessionMember($request, $session);

        $activeUserIds = $session->members()
            ->where('status', 'active')
            ->pluck('user_id');

        $locations = $session->currentLocations()
            ->with('user.profile')
            ->whereIn('user_id', $activeUserIds)
            ->get();

        return response()->json([
            'locations' => CurrentLocationResource::collection($locations),
        ]);
    }

    public function update(UpdateCurrentLocationRequest $request, TourSession $session): JsonResponse
    {
        $this->authorizeActiveSessionMember($request, $session);

        $data = $request->validated();
        $receivedAt = now();

        $location = DB::transaction(function () use ($request, $session, $data, $receivedAt) {
            $location = CurrentLocation::updateOrCreate(
                [
                    'tour_session_id' => $session->id,
                    'user_id' => $request->user()->id,
                ],
                [
                    'latitude' => $data['latitude'],
                    'longitude' => $data['longitude'],
                    'heading' => $data['heading'] ?? null,
                    'speed' => $data['speed'] ?? null,
                    'accuracy' => $data['accuracy'] ?? null,
                    'recorded_at' => $data['recorded_at'],
                    'received_at' => $receivedAt,
                ]
            );

            if ($this->shouldStoreHistory($session, $request->user()->id, $location)) {
                LocationHistory::create($location->only([
                    'tour_session_id',
                    'user_id',
                    'latitude',
                    'longitude',
                    'heading',
                    'speed',
                    'accuracy',
                    'recorded_at',
                    'received_at',
                ]));
            }

            return $location->load('user.profile');
        });

        return response()->json([
            'message' => 'Location updated successfully',
            'location' => new CurrentLocationResource($location),
        ]);
    }

    private function authorizeActiveSessionMember(Request $request, TourSession $session): void
    {
        if ($session->status !== 'active') {
            throw ValidationException::withMessages([
                'session' => ['Tour session tidak aktif.'],
            ])->status(422);
        }

        $isMember = $session->members()
            ->where('user_id', $request->user()->id)
            ->where('status', 'active')
            ->exists();

        if (! $isMember) {
            abort(403, 'Kamu bukan anggota aktif tour session ini.');
        }
    }

    private function shouldStoreHistory(TourSession $session, string $userId, CurrentLocation $location): bool
    {
        if ($location->accuracy !== null && $location->accuracy > 100) {
            return false;
        }

        $last = LocationHistory::where('tour_session_id', $session->id)
            ->where('user_id', $userId)
            ->latest('received_at')
            ->first();

        if (! $last) {
            return true;
        }

        if ($last->received_at->diffInSeconds($location->received_at) >= 60) {
            return true;
        }

        return $this->distanceMeters($last->latitude, $last->longitude, $location->latitude, $location->longitude) >= 50;
    }

    private function distanceMeters(float $fromLat, float $fromLon, float $toLat, float $toLon): float
    {
        $earthRadius = 6371000;
        $dLat = deg2rad($toLat - $fromLat);
        $dLon = deg2rad($toLon - $fromLon);
        $a = sin($dLat / 2) ** 2 + cos(deg2rad($fromLat)) * cos(deg2rad($toLat)) * sin($dLon / 2) ** 2;

        return $earthRadius * 2 * atan2(sqrt($a), sqrt(1 - $a));
    }
}
