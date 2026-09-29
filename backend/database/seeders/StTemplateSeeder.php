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
                    'header_title' => 'KEPALA BALAI,',
                    'penutup_text' => 'Demikian untuk dilaksanakan dengan penuh tanggung jawab.',
                    'date_format_style' => 'inline',
                    'signer_authority_mandate' => null,
                    'signer_title' => 'Kepala Balai,',
                    'tembusan_position' => 'beside',
                    'tembusan_label' => 'Tembusan:',
                    'tembusan_items' => [],
                    'sumber_dana' => 'dipa',
                    'default_jenis_tugas' => 'Melaksanakan Perjalanan Dinas ( Lebih dari 1 Hari )',
                    'biaya_text' => 'Segala biaya yang timbul akibat Surat Tugas ini dibebankan pada DIPA Balai KSDA Kalimantan Timur Ditjen KSDAE (693614) Tahun Anggaran {tahun};',
                    'nomor_surat_format' => '/K.18/TU/{klasifikasi}/B/{bulan}/{tahun}',
                    'untuk' => [
                        ['id' => 'default-u1', 'text' => 'Membuat laporan tertulis paling lambat 7 (tujuh) hari kerja setelah selesainya kegiatan tersebut.'],
                    ],
                ],
                'is_system' => true,
                'is_default' => true,
            ],
            [
                'name' => 'FOLU Net Sink 2030',
                'code' => 'folu',
                'description' => 'Template Surat Tugas untuk kegiatan Proyek FOLU Net Sink 2030 (NC 2&3).',
                'type' => StTemplateType::CUSTOM->value,
                'menimbang' => [
                    ['id' => 'folu-m1', 'text' => 'bahwa dalam upaya menjaga kelestarian keanekaragaman hayati dan ekosistem di Kalimantan Timur, perlu dilakukan kegiatan {nama kegiatan};'],
                    ['id' => 'folu-m2', 'text' => 'bahwa dalam rangka kelancaran tugas Project Management Unit FOLU-NC 2 dan 3 maka dipandang perlu menugaskan pegawai dimaksud;'],
                    ['id' => 'folu-m3', 'text' => 'bahwa untuk maksud tersebut (poin a dan b) perlu diterbitkan Surat Tugas.'],
                ],
                'dasar' => [
                    ['id' => 'folu-d1', 'text' => 'Peraturan Menteri Kehutanan Nomor 4 Tahun 2025 tentang Organisasi dan Tata Kerja Unit Pelaksana Teknis Direktorat Jenderal Konservasi Sumber Daya Alam dan Ekosistem;'],
                    ['id' => 'folu-d2', 'text' => 'Keputusan Kepala Biro Perencanaan Kementerian Kehutanan Selaku Project Director FOLU NC 2&3 Nomor SK.30/ROCAN/PK/REN.02/6/2025 tentang Perubahan Atas Keputusan Kepala Biro Perencanaan Selaku Project Director FOLU NC 2&3 Nomor SK.11/ROCAN/PK/REN.02/4/2025 tentang Pedoman Operasional Proyek Implementasi FOLU Net Sink 2030 Melalui Sumber Dana Kerja Sama Indonesia - Norwegia Tahap Kedua dan Ketiga yang dikelola oleh Badan Pengelola Dana Lingkungan Hidup dengan Mekanisme Pengelolaan Dana Lingkungan Hidup;'],
                    ['id' => 'folu-d3', 'text' => 'Keputusan Sekretaris Direktorat Jenderal Konservasi Sumber Daya Alam Dan Ekosistem Selaku Koordinator Kegiatan Implementing Partner FOLU Net Sink 2030 Melalui Sumber Dana Kerja Sama Indonesia Norwegia Tahap II Dan III Nomor: SK.2/KSDAE/FOLU.NC-23/I/2026 Tentang Penunjukan Personil Tim Pengelola Proyek Implementing Partner FOLU Net Sink 2030 Melalui Sumber Dana Kerja Sama Indonesia Norwegia Tahap II Dan III Yang Dikelola Oleh Badan Pengelola Dana Lingkungan Hidup;'],
                    ['id' => 'folu-d4', 'text' => 'Annual Work Plan (AWP) Tahun Anggaran {tahun} Implementasi FOLU Net Sink 2030 melalui Dukungan Sumber Dana Kerja Sama Indonesia-Norwegia Tahap Kedua dan Ketiga Ditjen KSDAE.'],
                ],
                'configuration' => [
                    'header_title' => "KEPALA UPT SELAKU\nPELAKSANA SATUAN KERJA IMPLEMENTING PARTNER FOLU NC 2&3",
                    'penutup_text' => 'Demikian Surat Perintah Tugas ini dibuat, untuk dapat dipergunakan sebagaimana mestinya dan kepada instansi yang dikunjungi dimohon bantuan seperlunya demi kelancaran pelaksanaan tugas.',
                    'date_format_style' => 'tabular',
                    'signer_authority_mandate' => "a.n. Sekretaris Direktorat Jenderal KSDAE\nselaku Koordinator Kegiatan Implementing\nPartner FOLU NC 2&3",
                    'signer_title' => 'Kepala Balai,',
                    'tembusan_position' => 'bottom',
                    'tembusan_label' => 'Tembusan Kepada :',
                    'tembusan_items' => [
                        'Kuasa Pengguna Anggaran Project Management Unit FOLU NC 2&3;',
                        'Sekretaris Direktorat Jenderal KSDAE selaku Koordinator Kegiatan;',
                        'Kepala Seksi KSDA Wilayah II Tenggarong;',
                        'Yang Bersangkutan.',
                    ],
                    'sumber_dana' => 'folu_nc23',
                    'default_jenis_tugas' => 'Melaksanakan Perjalanan Dinas ( Lebih dari 1 Hari )',
                    'nomor_surat_format' => '/K.18/TU/FOLU.NC-23/{klasifikasi}/B/{bulan}/{tahun}',
                    'untuk' => [
                        ['id' => 'folu-u1', 'text' => 'Membuat laporan tertulis paling lambat 7 (tujuh) hari kerja setelah selesainya kegiatan tersebut.'],
                    ],
                ],
                'is_system' => true,
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
                'configuration' => [
                    'default_jenis_tugas' => 'Menugaskan Staf',
                    'klasifikasi' => 'KAP.05',
                    'sumber_dana' => 'dl1',
                    'untuk' => [
                        ['id' => 'bmn-u1', 'text' => 'Membuat laporan tertulis paling lambat 7 (tujuh) hari setelah selesainya kegiatan tersebut.'],
                    ],
                ],
                'is_system' => true,
            ],
            [
                'name' => 'Beda Hari',
                'code' => 'beda-hari',
                'description' => 'Template Surat Tugas dengan tanggal per pegawai.',
                'type' => StTemplateType::BEDA_HARI->value,
                'configuration' => [
                    'default_jenis_tugas' => 'Melaksanakan Perjalanan Dinas ( Lebih dari 1 Hari )',
                    'untuk' => [
                        ['id' => 'beda-hari-u1', 'text' => 'Membuat laporan tertulis paling lambat 7 (tujuh) hari kerja setelah selesainya kegiatan tersebut.'],
                    ],
                ],
                'is_system' => true,
            ],
            [
                'name' => 'PLH',
                'code' => 'plh',
                'description' => 'Template Pelaksana Harian Kepala Seksi.',
                'type' => StTemplateType::PLH->value,
                'menimbang' => [
                    ['id' => 'plh-m1', 'text' => 'bahwa Kepala Seksi Konservasi Sumber Daya Alam Wilayah {wilayah} akan {kegiatan Kepala Seksi};'],
                    ['id' => 'plh-m2', 'text' => 'bahwa sehubungan dengan hal tersebut di atas untuk kelancaran pelaksanaan tugas sehari-hari maka perlu ada pejabat sementara yang menggantikan tugas Kepala Seksi Konservasi Sumber Daya Alam Wilayah {wilayah}.'],
                ],
                'dasar' => [
                    ['id' => 'plh-d1', 'text' => 'Surat Tugas Kepala Balai Konservasi Sumber Daya Alam Kalimantan Timur Nomor : {nomor surat induk} tanggal {tanggal surat induk}.'],
                ],
                'configuration' => [
                    'default_jenis_tugas' => 'Menugaskan Staf',
                    'default_mode_kegiatan' => 'manual',
                    'default_kegiatan' => 'Melaksanakan tugas sehari-hari sebagai pelaksana harian Kepala Seksi Konservasi Sumber Daya Alam Wilayah {wilayah}',
                    'klasifikasi' => 'PEG.09.01',
                    'sumber_dana' => 'dl1',
                    'untuk' => [
                        ['id' => 'plh-u1', 'text' => 'Hal-hal yang bersifat prinsip agar dikonsultasikan dengan Kepala Balai.'],
                    ],
                ],
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
