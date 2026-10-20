<?php

namespace Database\Seeders;

use App\Models\User;
use App\Modules\Kepegawaian\Models\Employee;
use Illuminate\Database\Seeder;
use Illuminate\Support\Str;

class EmployeeUserSeeder extends Seeder
{
    public function run(): void
    {
        $mmpCounter = 1;
        $created = 0;
        $skipped = 0;

        $employees = Employee::all();

        foreach ($employees as $employee) {
            $nip = $employee->nip;

            // Determine username
            if (str_starts_with($nip, 'MMP-')) {
                $username = 'mmp' . $mmpCounter;
                $mmpCounter++;
            } else {
                $username = $nip;
            }

            $existingUser = User::where('username', $username)->first();

            if ($existingUser) {
                // Never overwrite an existing password from a seeder.
                // But skip the admin account (super_admin role)
                if ($existingUser->role !== 'super_admin') {
                    $existingUser->update([
                        'access_modules' => [],
                        'role' => 'user',
                    ]);
                }
                $skipped++;
                continue;
            }

            User::create([
                'name' => $employee->nama_lengkap,
                'username' => $username,
                'email' => $username . '@bksda.local',
                // No known default password: an admin must set one through access management.
                'password' => Str::random(64),
                'role' => 'user',
                'access_modules' => [],
                'is_active' => false,
            ]);

            $created++;
        }

        $this->command->info("Created {$created} user accounts, updated/skipped {$skipped} existing.");
    }
}
