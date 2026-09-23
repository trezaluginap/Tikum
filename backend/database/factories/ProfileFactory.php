<?php

namespace Database\Factories;

use App\Models\Profile;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<Profile>
 */
class ProfileFactory extends Factory
{
    /**
     * Define the model's default state.
     *
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        return [
            'display_name' => fake()->name(),
            'vehicle_name' => fake()->randomElement(['Honda Beat', 'Yamaha NMAX', 'Vario 160', 'Ducati Panigale']),
            'phone_number' => fake()->phoneNumber(),
            'bio' => fake()->sentence(),
        ];
    }
}
