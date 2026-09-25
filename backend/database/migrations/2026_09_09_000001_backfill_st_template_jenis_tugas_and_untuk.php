<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    public function up(): void
    {
        $templates = [
            'plh' => [
                'default_jenis_tugas' => 'Menugaskan Staf',
                'default_kegiatan' => 'Melaksanakan tugas sehari-hari sebagai pelaksana harian Kepala Seksi Konservasi Sumber Daya Alam Wilayah {wilayah}',
                'untuk' => [
                    ['id' => 'plh-u1', 'text' => 'Hal-hal yang bersifat prinsip agar dikonsultasikan dengan Kepala Balai.'],
                ],
            ],
            'default' => [
                'default_jenis_tugas' => 'Melaksanakan Perjalanan Dinas ( Lebih dari 1 Hari )',
                'untuk' => [
                    ['id' => 'default-u1', 'text' => 'Membuat laporan tertulis paling lambat 7 (tujuh) hari kerja setelah selesainya kegiatan tersebut.'],
                ],
            ],
            'bmn-penghapusan' => [
                'default_jenis_tugas' => 'Menugaskan Staf',
                'untuk' => [
                    ['id' => 'bmn-u1', 'text' => 'Membuat laporan tertulis paling lambat 7 (tujuh) hari setelah selesainya kegiatan tersebut.'],
                ],
            ],
            'beda-hari' => [
                'default_jenis_tugas' => 'Melaksanakan Perjalanan Dinas ( Lebih dari 1 Hari )',
                'untuk' => [
                    ['id' => 'beda-hari-u1', 'text' => 'Membuat laporan tertulis paling lambat 7 (tujuh) hari kerja setelah selesainya kegiatan tersebut.'],
                ],
            ],
        ];

        foreach ($templates as $code => $additions) {
            $row = DB::table('st_templates')->where('code', $code)->first();
            if (! $row) {
                continue;
            }

            $currentConfig = [];
            if (! empty($row->configuration)) {
                $decoded = json_decode($row->configuration, true);
                if (is_array($decoded)) {
                    $currentConfig = $decoded;
                }
            }

            $updatedConfig = array_merge($currentConfig, $additions);

            DB::table('st_templates')
                ->where('id', $row->id)
                ->update([
                    'configuration' => json_encode($updatedConfig),
                    'updated_at' => now(),
                ]);
        }
    }

    public function down(): void
    {
        // Keep configuration as is
    }
};
