<?php

namespace App\Http\Controllers\Api;

use App\Events\SosAlertResolved;
use App\Events\SosAlertTriggered;
use App\Http\Controllers\Controller;
use App\Http\Requests\ResolveSosRequest;
use App\Http\Requests\TriggerSosRequest;
use App\Http\Resources\SosAlertResource;
use App\Models\SosAlert;
use App\Models\TourSession;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

class SosController extends Controller
{
    public function trigger(TriggerSosRequest $request, TourSession $session): JsonResponse
    {
        $this->authorizeActiveSessionMember($request, $session);

        $data = $request->validated();
        $now = now();

        $sosAlert = DB::transaction(function () use ($request, $session, $data, $now) {
            $exists = SosAlert::where('tour_session_id', $session->id)
                ->where('user_id', $request->user()->id)
                ->where('status', 'active')
                ->lockForUpdate()
                ->exists();

            if ($exists) {
                throw ValidationException::withMessages([
                    'sos' => ['SOS aktif sudah ada untuk user ini.'],
                ])->status(422);
            }

            return SosAlert::create([
                'tour_session_id' => $session->id,
                'user_id' => $request->user()->id,
                'status' => 'active',
                'message' => $data['message'] ?? null,
                'latitude' => $data['latitude'] ?? null,
                'longitude' => $data['longitude'] ?? null,
                'triggered_at' => $now,
            ])->load('user.profile');
        });

        event(new SosAlertTriggered($sosAlert));

        return response()->json([
            'message' => 'SOS triggered successfully',
            'sos_alert' => new SosAlertResource($sosAlert),
        ], 201);
    }

    public function resolve(ResolveSosRequest $request, TourSession $session, SosAlert $sosAlert): JsonResponse
    {
        $this->authorizeActiveSessionMember($request, $session);
        $this->authorizeSosBelongsToSession($session, $sosAlert);
        $this->authorizeCanResolve($request, $session, $sosAlert);

        if ($sosAlert->status !== 'active') {
            throw ValidationException::withMessages([
                'sos' => ['SOS sudah selesai.'],
            ])->status(422);
        }

        $sosAlert = DB::transaction(function () use ($request, $sosAlert) {
            $sosAlert->update([
                'status' => 'resolved',
                'resolved_at' => now(),
                'resolved_by_user_id' => $request->user()->id,
            ]);

            return $sosAlert->refresh()->load('user.profile');
        });

        event(new SosAlertResolved($sosAlert));

        return response()->json([
            'message' => 'SOS resolved successfully',
            'sos_alert' => new SosAlertResource($sosAlert),
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

    private function authorizeSosBelongsToSession(TourSession $session, SosAlert $sosAlert): void
    {
        if ($sosAlert->tour_session_id !== $session->id) {
            abort(404, 'SOS tidak ditemukan di session ini.');
        }
    }

    private function authorizeCanResolve(Request $request, TourSession $session, SosAlert $sosAlert): void
    {
        $isSender = $sosAlert->user_id === $request->user()->id;
        $isHost = $session->room()->where('host_user_id', $request->user()->id)->exists();

        if (! $isSender && ! $isHost) {
            abort(403, 'Hanya pengirim atau host yang bisa menyelesaikan SOS.');
        }
    }
}
