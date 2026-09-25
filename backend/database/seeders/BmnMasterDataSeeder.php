<?php

namespace Database\Seeders;

use App\Modules\Bmn\Models\AssetType;
use App\Modules\Bmn\Models\Location;
use Illuminate\Database\Seeder;

class BmnMasterDataSeeder extends Seeder
{
    public function run(): void
    {
        // 1. Seed Official Locations (28 Ruangan / Resor)
        $locationsByUnit = [
            'Kantor Balai KSDA Kalimantan Timur' => [
                'Kantor Balai KSDA Kalimantan Timur',
                'Urusan Umum dan Perlengkapan',
                'Urusan Kepegawaian',
                'Urusan Program dan Perencanaan',
                'Urusan Keuangan',
                'Urusan Evlab',
                'Urusan Teknis',
                'Urusan Perlindungan',
                'Urusan IKN',
            ],
            'Seksi KSDA Wilayah I (Berau)' => [
                'Seksi KSDA Wilayah I (Berau)',
                'Resor 01. Berau',
                'Resor 02. Pulau Semama dan Pulau Sangalaki',
                'Resor 03. Tanjung Selor',
                'Resor 04. Tarakan',
            ],
            'Seksi KSDA Wilayah II (Tenggarong)' => [
                'Seksi KSDA Wilayah II (Tenggarong)',
                'Resor 05. Samarinda',
                'Resor 06. Padang Luway',
                'Resor 07. Muara Kaman Sedulang',
                'Resor 08. Sangatta',
                'Resor 09. Suaka Badak Kelian',
            ],
            'Seksi KSDA Wilayah III (Balikpapan)' => [
                'Seksi KSDA Wilayah III (Balikpapan)',
                'Resor 10. Balikpapan',
                'Resor 11. Teluk Adang',
                'Resor 12. Teluk Apar',
                'Resor 13. Paser',
                'Resor 14. Ibu Kota Nusantara',
            ],
        ];

        foreach ($locationsByUnit as $unit => $rooms) {
            foreach ($rooms as $room) {
                Location::firstOrCreate(
                    ['name' => $room],
                    ['unit_kerja' => $unit]
                );
            }
        }

        // 2. Seed Official Asset Types (9 Jenis BMN Standar Pemerintah)
        $types = [
            [
                'name' => 'ALAT ANGKUTAN BERMOTOR',
                'category_mode' => 'kendaraan',
                'description' => 'Kendaraan dinas roda dua, roda empat, kendaraan operasional lapangan, dan speedboat',
            ],
            [
                'name' => 'ALAT BESAR',
                'category_mode' => 'peralatan',
                'description' => 'Alat berat, traktor, genset kapasitas besar, dan mesin konstruksi lapangan',
            ],
            [
                'name' => 'ALAT PERSENJATAAN',
                'category_mode' => 'peralatan',
                'description' => 'Senjata api dinas polisi kehutanan, amunisi, dan perlengkapan pengamanan',
            ],
            [
                'name' => 'BANGUNAN AIR',
                'category_mode' => 'bangunan',
                'description' => 'Dermaga, pos tambat kapal, bendungan kecil, dan saluran instalasi air bersih',
            ],
            [
                'name' => 'BANGUNAN DAN GEDUNG',
                'category_mode' => 'bangunan',
                'description' => 'Gedung kantor, pos jaga, laboratorium, wisma, dan shelter perlindungan',
            ],
            [
                'name' => 'MESIN PERALATAN KHUSUS TIK',
                'category_mode' => 'peralatan',
                'description' => 'Komputer server, PC, laptop, printer, scanner, GPS handheld, dan perangkat jaringan',
            ],
            [
                'name' => 'MESIN PERALATAN NON TIK',
                'category_mode' => 'peralatan',
                'description' => 'AC, lemari arsip, meja kerja, brankas, kamera pemantau hutan, dan teropong',
            ],
            [
                'name' => 'RUMAH NEGARA',
                'category_mode' => 'bangunan',
                'description' => 'Rumah dinas pejabat, rumah dinas staf, dan mess pegawai',
            ],
            [
                'name' => 'TANAH',
                'category_mode' => 'tanah',
                'description' => 'Tanah persil kantor, pos resor, kawasan fasilitas stasiun riset, dan cagar alam',
            ],
        ];

        foreach ($types as $t) {
            AssetType::firstOrCreate(
                ['name' => $t['name']],
                [
                    'category_mode' => $t['category_mode'],
                    'description' => $t['description'],
                ]
            );
        }
    }
}
