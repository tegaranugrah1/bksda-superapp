<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use App\Modules\BMN\Models\Asset;

class BMNSeeder extends Seeder
{
    public function run(): void
    {
        Asset::create([
            'code' => 'BMN-2024-001',
            'name' => 'Laptop Dell Latitude 5520',
            'category' => 'Peralatan dan Mesin',
            'condition' => 'baik',
            'acquisition_date' => '2024-01-15',
            'acquisition_value' => 15000000,
            'location' => 'Ruang Kerja Lantai 2',
            'status' => 'aktif',
            'notes' => 'Laptop untuk keperluan operasional kantor',
        ]);
    }
}
