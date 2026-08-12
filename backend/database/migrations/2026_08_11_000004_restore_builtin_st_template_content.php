<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Query\Builder;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    public function up(): void
    {
        $defaultMenimbang = [
            ['id' => 'default-m1', 'text' => 'bahwa dalam rangka , perlu ;'],
            ['id' => 'default-m2', 'text' => 'bahwa sehubungan butir a di atas perlu untuk menugaskan staf tersebut di bawah ini untuk melaksanakan kegiatan dimaksud.'],
        ];
        $defaultDasar = [
            ['id' => 'default-d1', 'text' => 'Peraturan Menteri Kehutanan Nomor 4 Tahun 2025 tentang Organisasi dan Tata Kerja Unit Pelaksana Teknis Direktorat Jenderal Konservasi Sumber Daya Alam dan Ekosistem;'],
            ['id' => 'default-d2', 'text' => 'Surat Pengesahan DIPA Tahun Anggaran {tahun} Balai Konservasi Sumber Daya Alam Kalimantan Timur Nomor: SP DIPA143.04.2.693614/{tahun} tanggal 24 April 2026.'],
        ];

        foreach (['default', 'beda-hari'] as $code) {
            /** @var Builder $query */
            $query = DB::table('st_templates')->where('code', $code);
            $template = $query->first();

            if (! $template) {
                continue;
            }

            $updates = [];
            if (empty($template->menimbang)) {
                $updates['menimbang'] = json_encode($defaultMenimbang);
            }
            if (empty($template->dasar)) {
                $updates['dasar'] = json_encode($defaultDasar);
            }

            if ($updates !== []) {
                $query->update($updates);
            }
        }
    }

    public function down(): void
    {
        // Content restoration is intentionally not reversed to avoid deleting admin data.
    }
};
