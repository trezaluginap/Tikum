<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\UpdateProfileRequest;
use App\Http\Resources\ProfileResource;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class ProfileController extends Controller
{
    public function show(Request $request): JsonResponse
    {
        return response()->json([
            'profile' => new ProfileResource($request->user()->profile),
        ]);
    }

    public function update(UpdateProfileRequest $request): JsonResponse
    {
        $profile = $request->user()->profile;
        $profile->update($request->validated());

        return response()->json([
            'message' => 'Profile updated successfully',
            'profile' => new ProfileResource($profile->refresh()),
        ]);
    }
}
