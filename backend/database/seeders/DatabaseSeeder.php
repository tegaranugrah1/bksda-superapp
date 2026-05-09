<?php

namespace Database\Seeders;

use App\Models\User;
use Illuminate\Database\Console\Seeds\WithoutModelEvents;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Hash;

class DatabaseSeeder extends Seeder
{
    use WithoutModelEvents;

    /**
     * Seed the application's database.
     */
    public function run(): void
    {
        User::factory()->create([
            'name' => 'Super Administrator',
            'username' => '199001012020121001', // Contoh NIP
            'email' => 'superadmin@bksda.go.id',
            'password' => Hash::make('password123'),
            'role' => 'super_admin',
            'access_modules' => ['inventory', 'reporting', 'users'],
            'is_active' => true,
        ]);
    }
}
