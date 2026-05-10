<?php

namespace Database\Seeders;

use App\Modules\BMN\Models\Asset;
use App\Modules\Core\Models\Employee;
use Illuminate\Database\Seeder;

class OfficialLocationSeeder extends Seeder
{
    public function run()
    {
        // 1. Structure Definition
        $structure = [
            'Balai KSDA Kalimantan Timur' => [
                'Urusan Umum dan Perlengkapan',
                'Urusan Kepegawaian',
                'Urusan Program',
                'Urusan Keuangan',
                'Urusan Data, Evaluasi, Pelaporan, dan Humas',
                'Urusan Teknis',
                'Urusan Perlindungan',
                'Urusan Konservasi IKN',
                'Perpustakaan',
                'Gudang ATK',
                'Musholla',
                'Gudang Kebakaran',
                'Gudang Senjata',
                'Ruang Kasubag TU',
                'Ruang Kepala Balai',
                'Lobby Lantai 1',
                'Lobby Lantai 2',
            ],
            'Seksi KSDA Wilayah I' => [
                'Resor KSDA Berau',
                'Resor KSDA Pulau Semama dan Pulau Sangalaki',
                'Resor KSDA Tanjung Selor',
                'Resor KSDA Tarakan',
            ],
            'Seksi KSDA Wilayah II' => [
                'Resor KSDA Samarinda',
                'Resor KSDA Padang Luway',
                'Resor KSDA Muara Kaman Sedulang',
                'Resor KSDA Sangatta',
                'Resor KSDA Suaka Badak kelian',
            ],
            'Seksi KSDA Wilayah III' => [
                'Resor KSDA Balikpapan',
                'Resor KSDA Teluk Adang',
                'Resor KSDA Teluk Apar',
                'Resor KSDA Paser',
                'Resor KSDA Ibu Kota Nusantara',
            ],
        ];

        // Get some employees for assignment
        $employees = Employee::where('status', 'active')->limit(50)->get();

        // 2. Update Existing Demo Assets (IDs 1, 2, 3)
        // Asset 1: Kantor BKSDA (ID 3 based on prev fix) -> Balai / Urusan Umum
        Asset::where('kode_barang', '4010101001')->update([
            'nama_satker' => 'Balai KSDA Kalimantan Timur',
            'lokasi_ruang' => 'Urusan Umum dan Perlengkapan',
            'nama_pengguna' => null, // Office usually has no single user
        ]);

        // Asset 2: Laptop ASUS (ID 2) -> Seksi I / Resor Berau -> Yulian Sadono
        Asset::where('kode_barang', '3050201001')->update([
            'nama_satker' => 'Seksi KSDA Wilayah I',
            'lokasi_ruang' => 'Resor KSDA Berau',
            'nama_pengguna' => 'Yulian Sadono',
        ]);

        // Asset 3: Toyota Avanza (ID 1) -> Seksi II / Resor Samarinda -> Suriawati Halim
        Asset::where('kode_barang', '3050105005')->update([
            'nama_satker' => 'Seksi KSDA Wilayah II',
            'lokasi_ruang' => 'Resor KSDA Samarinda',
            'nama_pengguna' => 'Suriawati Halim',
        ]);

        $this->command->info('Updated existing demo assets.');

        // 3. Generate New Dummy Assets for Distribution
        $dummyItems = [
            ['nama' => 'Laptop Dell Latitude', 'kode' => '3050201003', 'jenis' => 'MESIN PERALATAN KHUSUS TIK'],
            ['nama' => 'Printer Epson L3110', 'kode' => '3050204002', 'jenis' => 'MESIN PERALATAN KHUSUS TIK'],
            ['nama' => 'Meja Kerja Kayu', 'kode' => '3050102001', 'jenis' => 'MEUBELAIR'],
            ['nama' => 'Kursi Kerja Putar', 'kode' => '3050102002', 'jenis' => 'MEUBELAIR'],
            ['nama' => 'Lemari Besi', 'kode' => '3050102003', 'jenis' => 'MEUBELAIR'],
            ['nama' => 'AC Split 1PK', 'kode' => '3050203001', 'jenis' => 'ALAT PENDINGIN'],
            ['nama' => 'Sepeda Motor Honda CRF', 'kode' => '3050105006', 'jenis' => 'ALAT ANGKUTAN BERMOTOR'],
            ['nama' => 'GPS Garmin 64s', 'kode' => '3050205001', 'jenis' => 'ALAT UKUR'],
            ['nama' => 'Kamera Canon EOS', 'kode' => '3050206001', 'jenis' => 'ALAT STUDIO'],
            ['nama' => 'Drone DJI Mavic', 'kode' => '3050207001', 'jenis' => 'ALAT DOKUMENTASI'],
        ];

        // Flatten locations for random picking
        $flatLocations = [];
        foreach ($structure as $satker => $ruangs) {
            foreach ($ruangs as $ruang) {
                $flatLocations[] = ['satker' => $satker, 'ruang' => $ruang];
            }
        }

        // Create ~20 dummy assets distributed
        for ($i = 0; $i < 20; $i++) {
            $item = $dummyItems[array_rand($dummyItems)];
            $loc = $flatLocations[array_rand($flatLocations)];

            // 50% chance to have a user assigned
            $user = null;
            if (rand(0, 1)) {
                $emp = $employees->random();
                $user = $emp ? $emp->name : null;
            }

            // Create Asset
            Asset::create([
                'kode_barang' => $item['kode'].str_pad($i + 1, 3, '0', STR_PAD_LEFT),
                'nup' => $i + 10,
                'nama_barang' => $item['nama'].' - Unit '.($i + 1),
                'jenis_bmn' => $item['jenis'],
                'kondisi' => ['Baik', 'Rusak Ringan'][rand(0, 1)],
                'status_bmn' => 'Aktif',
                'nilai_perolehan' => rand(1000000, 50000000),
                'tanggal_perolehan' => now()->subDays(rand(10, 1000)),
                'nama_satker' => $loc['satker'],
                'lokasi_ruang' => $loc['ruang'],
                'nama_pengguna' => $user,
                // Required fields based on migration/model (using defaults)
                'kode_satker' => '000000',
                'jumlah_foto' => 0,
            ]);
        }

        $this->command->info('seeded 20 dummy assets across official locations.');
    }
}
