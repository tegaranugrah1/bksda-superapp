<?php

namespace Database\Seeders;

use App\Modules\Kepegawaian\Models\StExpenseTemplate;
use Illuminate\Database\Seeder;

class StExpenseTemplateSeeder extends Seeder
{
    public function run(): void
    {
        $templates = [
            [
                'name' => 'DIPA Balai KSDA Kalimantan Timur (693614)',
                'code' => 'dipa',
                'category' => 'dipa',
                'dasar_text' => 'Surat Pengesahan DIPA Tahun Anggaran {tahun} Balai Konservasi Sumber Daya Alam Kalimantan Timur Nomor: SP DIPA143.04.2.693614/{tahun} tanggal 24 April 2026.',
                'biaya_text' => 'Segala biaya yang timbul akibat Surat Tugas ini dibebankan pada DIPA Balai KSDA Kalimantan Timur Ditjen KSDAE (693614) Tahun Anggaran {tahun};',
                'is_active' => true,
                'is_default' => true,
                'sort_order' => 1,
            ],
            [
                'name' => 'Dana Hibah FOLU Net Sink 2030 (NC 2&3)',
                'code' => 'folu_nc23',
                'category' => 'hibah_folu',
                'dasar_text' => null,
                'biaya_text' => 'Segala biaya yang timbul akibat Surat Tugas ini dibebankan pada Anggaran Kegiatan FOLU Net Sink 2030 Result Based Contribution (RBC) NC 2&3 Balai KSDA Kalimantan Timur Tahun Anggaran {tahun};',
                'is_active' => true,
                'is_default' => false,
                'sort_order' => 2,
            ],
            [
                'name' => 'RKT Kerjasama PT Kideco Jaya Agung',
                'code' => 'kideco',
                'category' => 'kerjasama',
                'dasar_text' => 'Perjanjian kerjasama antara Balai KSDA Kalimantan Timur dan PT Kideco Jaya Agung Nomor : PKS.140/K.18/TU /Teknis/08/2023 dan Nomor : 213/KJA/LGL/CON/VIII/2023 tanggal 08 Agustus 2023.',
                'biaya_text' => 'Segala biaya yang timbul akibat Surat Tugas ini dibebankan pada Rencana Kerja Tahunan (RKT) Kegiatan Kerja Sama antara Balai KSDA Kalimantan Timur dengan PT Kideco Jaya Agung;',
                'is_active' => true,
                'is_default' => false,
                'sort_order' => 3,
            ],
            [
                'name' => 'RKT Kerjasama PT Multi Jayantara Abadi',
                'code' => 'multi_jayantara',
                'category' => 'kerjasama',
                'dasar_text' => 'Perjanjian Kerjasama antara Kepala Balai KSDA Kalimantan Timur dengan Direktur PT Multi Jayantara Abadi Nomor : PKS.36/K.18/TU/Teknis/02/2023 dan Nomor : 001/MJA-Dir/ TPG/II /2023 tanggal 01 Februari 2023.',
                'biaya_text' => 'Segala biaya yang timbul akibat Surat Tugas ini dibebankan pada Rencana Kerja Tahunan (RKT) Kegiatan Kerja Sama antara Balai KSDA Kalimantan Timur dengan PT Multi Jayantara Abadi;',
                'is_active' => true,
                'is_default' => false,
                'sort_order' => 4,
            ],
            [
                'name' => 'Biaya Kerjasama COP (Centre for Orangutan Protection)',
                'code' => 'cop',
                'category' => 'kerjasama',
                'dasar_text' => 'Perjanjian Kerja Sama Antara Balai Konservasi Sumber Daya Alam Kalimantan Timur dan Centre for Orangutan Protection (COP) Nomor: PKS.191/K.18/TU/Teknis/10/2023 dan Nomor 17/HQ10/COP/2023.',
                'biaya_text' => 'Segala biaya yang timbul akibat Surat Tugas ini dibebankan pada Biaya Kerjasama BKSDA Kalimantan Timur dan Centre for Orangutan Protection (COP);',
                'is_active' => true,
                'is_default' => false,
                'sort_order' => 5,
            ],
            [
                'name' => 'Anggaran PKS PT Pabrik Kertas Tjiwi Kimia Tbk',
                'code' => 'tjiwi_kimia',
                'category' => 'kerjasama',
                'dasar_text' => 'Perjanjian kerjasama antara Balai KSDA Kalimantan Timur dan PT. Pabrik Kertas Tjiwi Kimia Tbk., Nomor PKS.205/K.18/ TU/PK/12/ 2022 dan Nomor: 76/SSE JKT/APP/PKS/12/ 2022 tentang penguatan fungsi Kawasan Cagar Alam Muara Kaman Sedulang dan Pelestarian Keanekaragaman Hayati yang Dilindungi di Wilayah Kerja Balai KSDA Kalimantan Timur.',
                'biaya_text' => 'Segala biaya yang timbul akibat Surat Tugas ini dibebankan pada Anggaran Perjanjian Kerja Sama antara Balai KSDA Kalimantan Timur dan PT Pabrik Kertas Tjiwi Kimia Tbk;',
                'is_active' => true,
                'is_default' => false,
                'sort_order' => 6,
            ],
            [
                'name' => 'RKT Kerjasama Yayasan BOSF',
                'code' => 'bosf',
                'category' => 'kerjasama',
                'dasar_text' => 'Perjanjian Kerjasama antara Kepala Balai KSDA Kalimantan Timur dengan Ketua Pengurus Yayasan Penyelamatan Orangutan Borneo Nomor : PKS.184/K.18/TU/PK12/2021 dan Nomor 176/YBOS /XII/2021 tanggal 6 Desember 2021.',
                'biaya_text' => 'Segala biaya yang timbul akibat Surat Tugas ini dibebankan pada Rencana Kerja Tahunan (RKT) Kegiatan Kerja Sama antara Balai KSDA Kalimantan Timur dengan Yayasan Penyelamatan Orangutan Borneo (BOSF);',
                'is_active' => true,
                'is_default' => false,
                'sort_order' => 7,
            ],
            [
                'name' => 'Biaya Kerjasama CAN (Conservation Action Network)',
                'code' => 'can',
                'category' => 'kerjasama',
                'dasar_text' => 'Perjanjian Kerja Sama antara Balai Konservasi Sumber Daya Alam Kalimantan Timur dengan Conservation Action Network (CAN) Nomor : PKS.45/K.18/TU/KSA.2.5/03/2025 dan 007/K-JAK/PKS/III/2025 tanggal 14 Maret 2025.',
                'biaya_text' => 'Segala biaya yang timbul akibat Surat Tugas ini dibebankan pada Biaya Kerjasama BKSDA Kalimantan Timur dan Conservation Action Network (CAN);',
                'is_active' => true,
                'is_default' => false,
                'sort_order' => 8,
            ],
            [
                'name' => 'RKT Kerjasama ALeRT (Aliansi Lestari Rimba Terpadu)',
                'code' => 'alert',
                'category' => 'kerjasama',
                'dasar_text' => 'Perjanjian Kerjasama Antara Kepala Balai KSDA Kalimantan Timur dengan Direktur Aliansi Lestrai Rimba Terpadu (AleRT) Nomor: PKS.192/K.18/TU/Teknis/10/2023 dan Nomor: 51/PKS-ALeRT/ X/2023.',
                'biaya_text' => 'Segala biaya yang timbul akibat Surat Tugas ini dibebankan pada Rencana Kerja Tahunan (RKT) Kegiatan Kerja Sama antara Balai KSDA Kalimantan Timur dengan ALeRT (Aliansi Lestari Rimba Terpadu);',
                'is_active' => true,
                'is_default' => false,
                'sort_order' => 9,
            ],
            [
                'name' => 'DL 1 / Tanpa Biaya',
                'code' => 'dl1',
                'category' => 'dl1',
                'dasar_text' => null,
                'biaya_text' => null,
                'is_active' => true,
                'is_default' => false,
                'sort_order' => 10,
            ],
        ];

        foreach ($templates as $item) {
            StExpenseTemplate::updateOrCreate(
                ['code' => $item['code']],
                $item
            );
        }
    }
}
