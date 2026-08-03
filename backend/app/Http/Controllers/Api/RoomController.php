<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\JoinRoomRequest;
use App\Http\Requests\StoreRoomRequest;
use App\Http\Resources\RoomMemberResource;
use App\Http\Resources\RoomResource;
use App\Http\Resources\RoomTripResource;
use App\Models\Room;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

class RoomController extends Controller
{
    public function active(Request $request): JsonResponse
    {
        $rooms = Room::query()
            ->with(['trip', 'members.user.profile', 'activeSession.members'])
            ->where('status', 'active')
            ->whereHas('members', fn ($query) => $query
                ->where('user_id', $request->user()->id)
                ->where('status', 'active'))
            ->latest()
            ->limit(3)
            ->get();

        return response()->json([
            'rooms' => RoomResource::collection($rooms),
        ]);
    }

    public function store(StoreRoomRequest $request): JsonResponse
    {
        $data = $request->validated();
        $now = now();

        $room = DB::transaction(function () use ($request, $data, $now) {
            $room = Room::create([
                'room_pin' => $this->generatePin(),
                'host_user_id' => $request->user()->id,
                'status' => 'active',
            ]);

            $room->members()->create([
                'user_id' => $request->user()->id,
                'role' => 'host',
                'status' => 'active',
                'joined_at' => $now,
            ]);

            $room->trip()->create($data);

            $session = $room->sessions()->create([
                'started_by_user_id' => $request->user()->id,
                'status' => 'active',
                'started_at' => $now,
            ]);

            $session->members()->create([
                'user_id' => $request->user()->id,
                'role' => 'host',
                'status' => 'active',
                'joined_at' => $now,
            ]);

            return $room->load(['trip', 'members.user.profile', 'activeSession.members']);
        });

        return response()->json([
            'message' => 'Room created successfully',
            'room' => new RoomResource($room),
            'trip' => new RoomTripResource($room->trip),
            'session' => $room->activeSession ? new \App\Http\Resources\TourSessionResource($room->activeSession) : null,
            'members' => RoomMemberResource::collection($room->members),
        ], 201);
    }

    public function join(JoinRoomRequest $request): JsonResponse
    {
        $room = Room::with(['trip', 'members.user.profile', 'activeSession.members'])
            ->where('room_pin', $request->validated('room_pin'))
            ->first();

        if (! $room) {
            abort(404, 'Room tidak ditemukan.');
        }

        if ($room->status !== 'active') {
            throw ValidationException::withMessages([
                'room_pin' => ['Room sudah ditutup.'],
            ])->status(422);
        }

        if ($room->members()->where('user_id', $request->user()->id)->where('status', 'active')->exists()) {
            throw ValidationException::withMessages([
                'room_pin' => ['Kamu sudah bergabung di room ini.'],
            ])->status(422);
        }

        $now = now();

        $room = DB::transaction(function () use ($request, $room, $now) {
            $member = $room->members()->where('user_id', $request->user()->id)->first();
            if ($member) {
                $member->update(['role' => 'member', 'status' => 'active', 'joined_at' => $now, 'left_at' => null]);
            } else {
                $room->members()->create(['user_id' => $request->user()->id, 'role' => 'member', 'status' => 'active', 'joined_at' => $now]);
            }

            $session = $room->activeSession()->firstOrFail();
            $sessionMember = $session->members()->where('user_id', $request->user()->id)->first();
            if ($sessionMember) {
                $sessionMember->update(['role' => 'member', 'status' => 'active', 'joined_at' => $now, 'left_at' => null]);
            } else {
                $session->members()->create(['user_id' => $request->user()->id, 'role' => 'member', 'status' => 'active', 'joined_at' => $now]);
            }

            return $room->refresh()->load(['trip', 'members.user.profile', 'activeSession.members']);
        });

        return response()->json([
            'message' => 'Joined room successfully',
            'room' => new RoomResource($room),
            'trip' => new RoomTripResource($room->trip),
            'session' => $room->activeSession ? new \App\Http\Resources\TourSessionResource($room->activeSession) : null,
            'members' => RoomMemberResource::collection($room->members),
        ]);
    }

    public function show(Request $request, Room $room): JsonResponse
    {
        $this->authorizeMember($request, $room);

        return response()->json([
            'room' => new RoomResource($room->load(['trip', 'members.user.profile', 'activeSession.members'])),
        ]);
    }

    public function members(Request $request, Room $room): JsonResponse
    {
        $this->authorizeMember($request, $room);

        return response()->json([
            'members' => RoomMemberResource::collection($room->members()->with('user.profile')->get()),
        ]);
    }

    public function trip(Request $request, Room $room): JsonResponse
    {
        $this->authorizeMember($request, $room);

        return response()->json([
            'trip' => new RoomTripResource($room->trip()->firstOrFail()),
        ]);
    }

    public function leave(Request $request, Room $room): JsonResponse
    {
        $member = $this->activeMember($request, $room);

        if ($member->role === 'host' && $room->status === 'active') {
            throw ValidationException::withMessages([
                'room' => ['Host harus menutup room aktif.'],
            ])->status(422);
        }

        DB::transaction(function () use ($request, $room, $member) {
            $now = now();
            $member->update(['status' => 'left', 'left_at' => $now]);
            $room->activeSession?->members()
                ->where('user_id', $request->user()->id)
                ->where('status', 'active')
                ->update(['status' => 'left', 'left_at' => $now]);
        });

        return response()->json([
            'message' => 'Left room successfully',
        ]);
    }

    public function close(Request $request, Room $room): JsonResponse
    {
        if ($room->host_user_id !== $request->user()->id) {
            abort(403, 'Hanya host yang bisa menutup room.');
        }

        DB::transaction(function () use ($room) {
            $now = now();
            $room->update(['status' => 'closed', 'closed_at' => $now]);
            $room->activeSession?->update(['status' => 'finished', 'finished_at' => $now]);
        });

        return response()->json([
            'message' => 'Room closed successfully',
            'room' => new RoomResource($room->refresh()->load(['trip', 'members.user.profile', 'activeSession.members'])),
        ]);
    }

    private function generatePin(): string
    {
        for ($attempt = 0; $attempt < 10; $attempt++) {
            $pin = $this->randomPin();
            if (! Room::where('room_pin', $pin)->exists()) {
                return $pin;
            }
        }

        throw ValidationException::withMessages([
            'room_pin' => ['Gagal membuat PIN unik.'],
        ])->status(500);
    }

    protected function randomPin(): string
    {
        return (string) random_int(100000, 999999);
    }

    private function authorizeMember(Request $request, Room $room): void
    {
        if (! $room->members()->where('user_id', $request->user()->id)->where('status', 'active')->exists()) {
            abort(403, 'Kamu bukan member aktif room ini.');
        }
    }

    private function activeMember(Request $request, Room $room): \App\Models\RoomMember
    {
        $member = $room->members()->where('user_id', $request->user()->id)->where('status', 'active')->first();

        if (! $member) {
            abort(403, 'Kamu bukan member aktif room ini.');
        }

        return $member;
    }
}
