<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\UpdateProfileRequest;
use App\Http\Requests\UploadAvatarRequest;
use App\Http\Resources\ProfileResource;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;

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

    public function uploadAvatar(UploadAvatarRequest $request): JsonResponse
    {
        $profile = $request->user()->profile;
        $oldAvatarPath = $profile->avatar_path;
        $file = $request->file('avatar');
        $path = $file->storeAs(
            "avatars/{$request->user()->id}",
            Str::uuid().'.'.$file->extension(),
            'public'
        );

        $profile->update(['avatar_path' => $path]);

        if ($oldAvatarPath && $oldAvatarPath !== $path) {
            Storage::disk('public')->delete($oldAvatarPath);
        }

        return response()->json([
            'message' => 'Avatar uploaded successfully',
            'avatar_url' => $request->getSchemeAndHttpHost().'/storage/'.$path,
            'profile' => new ProfileResource($profile->refresh()),
        ]);
    }
}
