<?php

namespace Database\Seeders;

use App\Models\User;
use App\Modules\Kepegawaian\Models\Employee;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Hash;

class EmployeeUserSeeder extends Seeder
{
    public function run(): void
    {
        $password = Hash::make('123');
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
                // Update existing user: set password to 123, access_modules to empty
                // But skip the admin account (super_admin role)
                if ($existingUser->role !== 'super_admin') {
                    $existingUser->update([
                        'password' => $password,
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
                'password' => $password,
                'role' => 'user',
                'access_modules' => [],
                'is_active' => true,
            ]);

            $created++;
        }

        $this->command->info("Created {$created} user accounts, updated/skipped {$skipped} existing.");
    }
}
