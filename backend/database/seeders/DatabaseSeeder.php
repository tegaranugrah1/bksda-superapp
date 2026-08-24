<?php

namespace Database\Seeders;

use App\Modules\DeReporting\Database\Seeders\InitDataSeeder;
use Illuminate\Database\Console\Seeds\WithoutModelEvents;
use Illuminate\Database\Seeder;

class DatabaseSeeder extends Seeder
{
    use WithoutModelEvents;

    public function run(): void
    {
        $this->call([
            SuperAdminSeeder::class,
            RealDataSeeder::class,
            EmployeeSeeder::class,
            InitDataSeeder::class,
            StTemplateSeeder::class,
        ]);
    }
}
