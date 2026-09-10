<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\TripHistoryIndexRequest;
use App\Http\Resources\TripHistoryDetailResource;
use App\Http\Resources\TripHistoryResource;
use App\Models\TourSession;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class HistoryController extends Controller
{
    public function index(TripHistoryIndexRequest $request): JsonResponse
    {
        $role = $request->validated('role', 'all');
        $perPage = $request->integer('per_page', 10);

        $query = TourSession::query()
            ->whereIn('status', ['finished', 'cancelled'])
            ->whereHas('members', function ($query) use ($request, $role) {
                $query->where('user_id', $request->user()->id);

                if (in_array($role, ['host', 'member'], true)) {
                    $query->where('role', $role);
                }
            })
            ->with([
                'room.trip',
                'members' => fn ($query) => $query->where('user_id', $request->user()->id),
            ])
            ->withCount('members')
            ->latest('finished_at')
            ->latest('started_at');

        $sessions = $query->paginate($perPage);

        return response()->json([
            'trips' => TripHistoryResource::collection($sessions->getCollection()),
            'meta' => [
                'current_page' => $sessions->currentPage(),
                'per_page' => $sessions->perPage(),
                'total' => $sessions->total(),
                'last_page' => $sessions->lastPage(),
                'has_more' => $sessions->hasMorePages(),
            ],
        ]);
    }

    public function show(Request $request, TourSession $session): JsonResponse
    {
        abort_unless(
            in_array($session->status, ['finished', 'cancelled'], true)
                && $session->members()->where('user_id', $request->user()->id)->exists(),
            403
        );

        $session->load([
            'room.trip',
            'room.members.user.profile',
            'members.user.profile',
        ])->loadCount('members');

        return response()->json([
            'trip' => new TripHistoryDetailResource($session),
        ]);
    }
}
