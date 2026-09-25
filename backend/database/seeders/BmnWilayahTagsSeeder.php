<?php

namespace Database\Seeders;

use App\Modules\Bmn\Models\Tag;
use Illuminate\Database\Seeder;

class BmnWilayahTagsSeeder extends Seeder
{
    public function run(): void
    {
        $tags = [
            // Seksi KSDA Wilayah I (Berau)
            [
                'name' => 'resor01-berau',
                'label' => '#resor01-berau',
                'color' => 'blue',
                'description' => 'Resor 01. Berau (SKW I)',
            ],
            [
                'name' => 'resor02-semama-sangalaki',
                'label' => '#resor02-semama-sangalaki',
                'color' => 'cyan',
                'description' => 'Resor 02. Pulau Semama dan Pulau Sangalaki (SKW I)',
            ],
            [
                'name' => 'resor03-tanjung-selor',
                'label' => '#resor03-tanjung-selor',
                'color' => 'sky',
                'description' => 'Resor 03. Tanjung Selor (SKW I)',
            ],
            [
                'name' => 'resor04-tarakan',
                'label' => '#resor04-tarakan',
                'color' => 'teal',
                'description' => 'Resor 04. Tarakan (SKW I)',
            ],

            // Seksi KSDA Wilayah II (Tenggarong)
            [
                'name' => 'resor05-samarinda',
                'label' => '#resor05-samarinda',
                'color' => 'emerald',
                'description' => 'Resor 05. Samarinda (SKW II)',
            ],
            [
                'name' => 'resor06-padang-luway',
                'label' => '#resor06-padang-luway',
                'color' => 'green',
                'description' => 'Resor 06. Padang Luway (SKW II)',
            ],
            [
                'name' => 'resor07-muara-kaman',
                'label' => '#resor07-muara-kaman',
                'color' => 'lime',
                'description' => 'Resor 07. Muara Kaman Sedulang (SKW II)',
            ],
            [
                'name' => 'resor08-sangatta',
                'label' => '#resor08-sangatta',
                'color' => 'amber',
                'description' => 'Resor 08. Sangatta (SKW II)',
            ],
            [
                'name' => 'resor09-badak-kelian',
                'label' => '#resor09-badak-kelian',
                'color' => 'orange',
                'description' => 'Resor 09. Suaka Badak Kelian (SKW II)',
            ],

            // Seksi KSDA Wilayah III (Balikpapan)
            [
                'name' => 'resor10-balikpapan',
                'label' => '#resor10-balikpapan',
                'color' => 'indigo',
                'description' => 'Resor 10. Balikpapan (SKW III)',
            ],
            [
                'name' => 'resor11-teluk-adang',
                'label' => '#resor11-teluk-adang',
                'color' => 'violet',
                'description' => 'Resor 11. Teluk Adang (SKW III)',
            ],
            [
                'name' => 'resor12-teluk-apar',
                'label' => '#resor12-teluk-apar',
                'color' => 'purple',
                'description' => 'Resor 12. Teluk Apar (SKW III)',
            ],
            [
                'name' => 'resor13-paser',
                'label' => '#resor13-paser',
                'color' => 'fuchsia',
                'description' => 'Resor 13. Paser (SKW III)',
            ],
            [
                'name' => 'resor14-ikn',
                'label' => '#resor14-ikn',
                'color' => 'rose',
                'description' => 'Resor 14. Ibu Kota Nusantara (SKW III)',
            ],
        ];

        foreach ($tags as $tagData) {
            Tag::firstOrCreate(
                ['name' => $tagData['name']],
                [
                    'label' => $tagData['label'],
                    'color' => $tagData['color'],
                    'description' => $tagData['description'],
                ]
            );
        }
    }
}
