<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;

class EmployeeSeeder extends Seeder
{
    public function run(): void
    {
        DB::statement('TRUNCATE TABLE kpg_employees RESTART IDENTITY CASCADE;');

        $employees = json_decode(file_get_contents(database_path('seeders/employees_data.json')), true);

        foreach (array_chunk($employees, 50) as $chunk) {
            DB::table('kpg_employees')->insert(array_map(function ($emp) {
                return array_merge($emp, [
                    'is_active' => true,
                    'created_at' => now(),
                    'updated_at' => now(),
                ]);
            }, $chunk));
        }

        $this->command->info('Seeded ' . count($employees) . ' employees successfully.');
    }
}
