<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('rooms', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->string('room_pin', 6)->unique();
            $table->foreignUuid('host_user_id')->constrained('users')->cascadeOnDelete();
            $table->string('status')->default('active');
            $table->timestamp('closed_at')->nullable();
            $table->timestamps();
        });

        Schema::create('room_members', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->foreignUuid('room_id')->constrained()->cascadeOnDelete();
            $table->foreignUuid('user_id')->constrained()->cascadeOnDelete();
            $table->string('role');
            $table->string('status')->default('active');
            $table->timestamp('joined_at');
            $table->timestamp('left_at')->nullable();
            $table->timestamps();
            $table->unique(['room_id', 'user_id']);
        });

        Schema::create('room_trips', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->foreignUuid('room_id')->unique()->constrained()->cascadeOnDelete();
            $table->string('origin_name');
            $table->decimal('origin_latitude', 10, 7);
            $table->decimal('origin_longitude', 10, 7);
            $table->string('destination_name');
            $table->decimal('destination_latitude', 10, 7);
            $table->decimal('destination_longitude', 10, 7);
            $table->string('vehicle_type');
            $table->boolean('use_tolls')->nullable();
            $table->unsignedSmallInteger('vehicle_count');
            $table->decimal('route_distance_km', 8, 2)->nullable();
            $table->unsignedInteger('route_duration_min')->nullable();
            $table->timestamps();
        });

        Schema::create('tour_sessions', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->foreignUuid('room_id')->constrained()->cascadeOnDelete();
            $table->foreignUuid('started_by_user_id')->constrained('users')->cascadeOnDelete();
            $table->string('status')->default('active');
            $table->timestamp('started_at');
            $table->timestamp('finished_at')->nullable();
            $table->timestamps();
        });

        Schema::create('tour_session_members', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->foreignUuid('tour_session_id')->constrained()->cascadeOnDelete();
            $table->foreignUuid('user_id')->constrained()->cascadeOnDelete();
            $table->string('role');
            $table->string('status')->default('active');
            $table->timestamp('joined_at');
            $table->timestamp('left_at')->nullable();
            $table->timestamps();
            $table->unique(['tour_session_id', 'user_id']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('tour_session_members');
        Schema::dropIfExists('tour_sessions');
        Schema::dropIfExists('room_trips');
        Schema::dropIfExists('room_members');
        Schema::dropIfExists('rooms');
    }
};
