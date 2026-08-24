<?php

namespace Database\Seeders;

use App\Modules\Kepegawaian\Enums\StTemplateType;
use App\Modules\Kepegawaian\Models\StTemplate;
use Illuminate\Database\Seeder;

class StTemplateSeeder extends Seeder
{
    public function run(): void
    {
        $templates = [
            [
                'name' => 'Default',
                'code' => 'default',
                'description' => 'Template Surat Tugas standar.',
                'type' => StTemplateType::STANDARD->value,
                'menimbang' => [
                    ['id' => 'default-m1', 'text' => 'bahwa dalam rangka , perlu ;'],
                    ['id' => 'default-m2', 'text' => 'bahwa sehubungan butir a di atas perlu untuk menugaskan staf tersebut di bawah ini untuk melaksanakan kegiatan dimaksud.'],
                ],
                'dasar' => [
                    ['id' => 'default-d1', 'text' => 'Peraturan Menteri Kehutanan Nomor 4 Tahun 2025 tentang Organisasi dan Tata Kerja Unit Pelaksana Teknis Direktorat Jenderal Konservasi Sumber Daya Alam dan Ekosistem;'],
                    ['id' => 'default-d2', 'text' => 'Surat Pengesahan DIPA Tahun Anggaran {tahun} Balai Konservasi Sumber Daya Alam Kalimantan Timur Nomor: SP DIPA143.04.2.693614/{tahun} tanggal 24 April 2026.'],
                ],
                'configuration' => [
                    'biaya_text' => 'Segala biaya yang timbul akibat Surat Tugas ini dibebankan pada DIPA Balai KSDA Kalimantan Timur Ditjen KSDAE (693614) Tahun Anggaran {tahun};',
                    'nomor_surat_format' => '/K.18/TU/{klasifikasi}/B/{bulan}/{tahun}',
                ],
                'is_system' => true,
                'is_default' => true,
            ],
            [
                'name' => 'Penghapusan BMN',
                'code' => 'bmn-penghapusan',
                'description' => 'Template pemeriksaan untuk proses penghapusan BMN.',
                'type' => StTemplateType::BMN->value,
                'menimbang' => [
                    ['id' => 'bmn-m1', 'text' => 'bahwa dalam rangka penghapusan Barang Milik Negara berupa Alat Angkutan Bermotor pada Balai Konservasi Sumber Daya Alam Kalimantan Timur;'],
                    ['id' => 'bmn-m2', 'text' => 'bahwa sehubungan dengan butir a tersebut di atas dipandang perlu untuk menugaskan staf tersebut di bawah ini untuk melakukan pemeriksaan Barang Milik Negara.'],
                ],
                'dasar' => [
                    ['id' => 'bmn-d1', 'text' => 'Undang-Undang RI Nomor 17 Tahun 2003 tentang Keuangan Negara;'],
                    ['id' => 'bmn-d2', 'text' => 'Undang-Undang RI Nomor 1 Tahun 2004 tentang Perbendaharaan Negara;'],
                    ['id' => 'bmn-d3', 'text' => 'Peraturan Pemerintah Nomor 27 Tahun 2014 tentang Pengelolaan Barang Milik Negara/Daerah sebagaimana telah diubah dengan Peraturan Pemerintah Nomor 28 Tahun 2020;'],
                    ['id' => 'bmn-d4', 'text' => 'Peraturan Presiden Nomor 175 Tahun 2024 tentang Kementerian Kehutanan;'],
                    ['id' => 'bmn-d5', 'text' => 'Peraturan Menteri Keuangan Nomor 4/PMK.06/2015 tentang Pendelegasian Kewenangan dan Tanggung Jawab Tertentu Dari Pengelola Barang kepada Pengguna Barang;'],
                    ['id' => 'bmn-d6', 'text' => 'Peraturan Menteri Keuangan Nomor 83/PMK.06/2016 tentang Tata Cara Pelaksanaan Pemusnahan dan Penghapusan Barang Milik Negara;'],
                    ['id' => 'bmn-d7', 'text' => 'Peraturan Menteri Keuangan Nomor 181/PMK.06/2016 tentang Penatausahaan Barang Milik Negara;'],
                    ['id' => 'bmn-d8', 'text' => 'Peraturan Menteri Lingkungan Hidup dan Kehutanan Nomor P.11/MENLHK/SETJEN/KAP.3/4/2018 tentang Tata Cara Pelaksanaan Pemindahtanganan Barang Milik Negara Lingkup Kementerian Lingkungan Hidup dan Kehutanan.'],
                ],
                'configuration' => ['klasifikasi' => 'KAP.05', 'sumber_dana' => 'dl1'],
                'is_system' => true,
            ],
            [
                'name' => 'Beda Hari',
                'code' => 'beda-hari',
                'description' => 'Template Surat Tugas dengan tanggal per pegawai.',
                'type' => StTemplateType::BEDA_HARI->value,
                'is_system' => true,
            ],
            [
                'name' => 'PLH',
                'code' => 'plh',
                'description' => 'Template Pelaksana Harian Kepala Seksi.',
                'type' => StTemplateType::PLH->value,
                'menimbang' => [
                    ['id' => 'plh-m1', 'text' => 'bahwa Kepala Seksi Konservasi Sumber Daya Alam Wilayah {wilayah} akan melaksanakan {kegiatan Kepala Seksi};'],
                    ['id' => 'plh-m2', 'text' => 'bahwa sehubungan dengan hal tersebut di atas untuk kelancaran pelaksanaan tugas sehari-hari maka perlu ada pejabat sementara yang menggantikan tugas Kepala Seksi Konservasi Sumber Daya Alam Wilayah {wilayah}.'],
                ],
                'dasar' => [
                    ['id' => 'plh-d1', 'text' => 'Surat Tugas Kepala Balai Konservasi Sumber Daya Alam Kalimantan Timur Nomor : {nomor surat induk} tanggal {tanggal surat induk}.'],
                ],
                'configuration' => ['klasifikasi' => 'PEG.09.01', 'sumber_dana' => 'dl1'],
                'is_system' => true,
            ],
        ];

        foreach ($templates as $attributes) {
            $template = StTemplate::firstOrNew(['code' => $attributes['code']]);

            if (! $template->exists) {
                $template->fill(array_merge($attributes, ['is_active' => true]));
            } else {
                // Seed metadata without overwriting edits made by superadmin.
                $template->fill([
                    'name' => $attributes['name'],
                    'description' => $attributes['description'],
                    'type' => $attributes['type'],
                    'is_system' => true,
                    'is_active' => $template->is_active ?? true,
                ]);

                foreach (['menimbang', 'dasar'] as $field) {
                    if (empty($template->{$field}) && array_key_exists($field, $attributes)) {
                        $template->{$field} = $attributes[$field];
                    }
                }
                if (array_key_exists('configuration', $attributes)) {
                    $template->configuration = array_merge($attributes['configuration'] ?? [], $template->configuration ?? []);
                }
            }

            $template->save();
        }
    }
}
