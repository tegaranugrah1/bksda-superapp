<?php

namespace App\Modules\Keuangan\Controllers;

use App\Http\Controllers\Controller;
use App\Modules\Keuangan\Models\VisumSpdSetting;
use App\Modules\Keuangan\Models\VisumSpdTemplate;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class VisumSpdController extends Controller
{
    /**
     * Get global settings for Visum SPD (Officials of 4 regions & PPK).
     */
    public function getSettings(): JsonResponse
    {
        $setting = VisumSpdSetting::where('key', 'officials_and_ppk')->first();

        $default = [
            'samarinda' => [
                'place' => 'Samarinda',
                'official_name' => 'Dheny Mardiono, S.Hut., MSc.',
                'official_nip' => '19750314 199903 1 004',
                'depart_position' => "a.n. Kepala Balai\nKepala Subbagian Tata Usaha",
                'depart_position_dipa' => 'Kepala Subbagian Tata Usaha,',
                'depart_position_folu' => "a.n. Kepala Balai\nKepala Subbagian Tata Usaha",
                'return_position' => 'Kepala Subbagian Tata Usaha',
            ],
            'berau' => [
                'place' => 'Berau',
                'official_name' => 'Yulian Sadono, S.Hut., M.T.',
                'official_nip' => '19800707 200604 1 003',
                'depart_position' => "a.n. Kepala Balai\nKepala Seksi Konservasi Sumber\nDaya Alam Wilayah I",
                'depart_position_dipa' => 'Kepala Seksi Konservasi Sumber Daya Alam Wilayah I,',
                'depart_position_folu' => "a.n. Kepala Balai\nKepala Seksi Konservasi Sumber\nDaya Alam Wilayah I",
                'return_position' => "Kepala Seksi Konservasi Sumber\nDaya Alam Wilayah I",
            ],
            'tenggarong' => [
                'place' => 'Tenggarong',
                'official_name' => 'Suriawati Halim, S.Hut., M.P.',
                'official_nip' => '19751127 200003 2 001',
                'depart_position' => "a.n. Kepala Balai\nKepala Seksi Konservasi Sumber\nDaya Alam Wilayah II",
                'depart_position_dipa' => 'Kepala Seksi Konservasi Sumber Daya Alam Wilayah II,',
                'depart_position_folu' => "a.n. Kepala Balai\nKepala Seksi Konservasi Sumber\nDaya Alam Wilayah II",
                'return_position' => "Kepala Seksi Konservasi Sumber\nDaya Alam Wilayah II",
            ],
            'balikpapan' => [
                'place' => 'Balikpapan',
                'official_name' => 'Bambang Hari Trimarsito, S.Si., M.P.',
                'official_nip' => '19740626 200112 1 004',
                'depart_position' => "a.n. Kepala Balai\nKepala Seksi Konservasi Sumber\nDaya Alam Wilayah III",
                'depart_position_dipa' => 'Kepala Seksi Konservasi Sumber Daya Alam Wilayah III,',
                'depart_position_folu' => "a.n. Kepala Balai\nKepala Seksi Konservasi Sumber\nDaya Alam Wilayah III",
                'return_position' => "Kepala Seksi Konservasi Sumber\nDaya Alam Wilayah III",
            ],
            'ppk' => [
                'name' => 'Ahmad Hidayat, S.PKP., M.Ling',
                'nip' => '19820301 200012 1 001',
                'position' => 'Pejabat Pembuat Komitmen,',
                'statement' => 'Telah diperiksa dengan keterangan bahwa perjalanan tersebut atas perintahnya dan semata-mata untuk kepentingan jabatan dalam waktu yang sesingkat-singkatnya.',
            ],
            'ppk_dipa' => [
                'name' => 'RUSMANTO, S.Hut',
                'nip' => '19810907 200012 1 004',
                'position' => 'Pejabat Pembuat Komitmen,',
                'statement' => 'Telah diperiksa dengan keterangan bahwa perjalanan tersebut atas perintahnya dan semata-mata untuk kepentingan jabatan dalam waktu yang sesingkat-singkatnya.',
            ],
            'ppk_folu' => [
                'name' => 'Ahmad Hidayat, S.PKP., M.Ling',
                'nip' => '19820301 200012 1 001',
                'position' => 'Pejabat Pembuat Komitmen,',
                'statement' => 'Telah diperiksa dengan keterangan bahwa perjalanan tersebut atas perintahnya dan semata-mata untuk kepentingan jabatan dalam waktu yang sesingkat-singkatnya.',
            ],
        ];

        if (! $setting) {
            $setting = VisumSpdSetting::create([
                'key' => 'officials_and_ppk',
                'value' => $default,
            ]);
        } else {
            $currentVal = $setting->value ?? [];
            $merged = array_merge($default, $currentVal);

            foreach (['samarinda', 'berau', 'tenggarong', 'balikpapan'] as $regKey) {
                if (isset($merged[$regKey])) {
                    if (empty($merged[$regKey]['depart_position_dipa'])) {
                        $merged[$regKey]['depart_position_dipa'] = $default[$regKey]['depart_position_dipa'];
                    }
                    if (empty($merged[$regKey]['depart_position_folu'])) {
                        $merged[$regKey]['depart_position_folu'] = $merged[$regKey]['depart_position'] ?? $default[$regKey]['depart_position_folu'];
                    }
                }
            }

            if (empty($merged['ppk_dipa'])) {
                $merged['ppk_dipa'] = $default['ppk_dipa'];
            }
            if (empty($merged['ppk_folu'])) {
                $merged['ppk_folu'] = $merged['ppk'] ?? $default['ppk_folu'];
            }
            if ($merged !== $currentVal) {
                $setting->update(['value' => $merged]);
            }
        }

        return response()->json([
            'success' => true,
            'data' => $setting->value,
        ]);
    }

    /**
     * Update global officials & PPK settings.
     */
    public function updateSettings(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'samarinda' => 'required|array',
            'berau' => 'required|array',
            'tenggarong' => 'required|array',
            'balikpapan' => 'required|array',
            'ppk' => 'nullable|array',
            'ppk_dipa' => 'nullable|array',
            'ppk_folu' => 'nullable|array',
        ]);

        if (empty($validated['ppk']) && ! empty($validated['ppk_folu'])) {
            $validated['ppk'] = $validated['ppk_folu'];
        }

        $setting = VisumSpdSetting::updateOrCreate(
            ['key' => 'officials_and_ppk'],
            ['value' => $validated]
        );

        return response()->json([
            'success' => true,
            'message' => 'Pengaturan Pejabat Wilayah & PPK berhasil diperbarui.',
            'data' => $setting->value,
        ]);
    }

    /**
     * Get all Visum SPD templates.
     */
    public function getTemplates(): JsonResponse
    {
        $today = date('d F Y');
        $settingObj = VisumSpdSetting::where('key', 'officials_and_ppk')->first();
        $settings = $settingObj ? $settingObj->value : [];

        $dipaPpk = $settings['ppk_dipa'] ?? ['name' => 'RUSMANTO, S.Hut', 'nip' => '19810907 200012 1 004'];
        $foluPpk = $settings['ppk_folu'] ?? $settings['ppk'] ?? ['name' => 'Ahmad Hidayat, S.PKP., M.Ling', 'nip' => '19820301 200012 1 001'];

        $defaultTemplates = [
            [
                'name' => '[DIPA] Balai Samarinda',
                'description' => 'Template SPD DIPA Balai BKSDA Kalimantan Timur (Samarinda)',
                'is_default' => false,
                'auto_today_date' => true,
                'data' => [
                    'spd_type' => 'dipa',
                    'asal_tempat' => 'Samarinda',
                    'asal_tanggal' => $today,
                    'tujuan_awal' => '',
                    'asal_jabatan_pengesah' => $settings['samarinda']['depart_position_dipa'] ?? 'Kepala Subbagian Tata Usaha,',
                    'asal_nama_pejabat' => $settings['samarinda']['official_name'] ?? 'Dheny Mardiono, S.Hut., MSc.',
                    'asal_nip_pejabat' => $settings['samarinda']['official_nip'] ?? '19750314 199903 1 004',
                    'tujuan_1_tempat' => '',
                    'tujuan_1_tiba_tanggal' => $today,
                    'tujuan_1_kepala_jabatan' => '',
                    'tujuan_1_kepala_nama' => '',
                    'tujuan_1_kepala_nip' => '',
                    'tujuan_1_id_type' => 'NIP',
                    'tujuan_1_berangkat_dari' => '',
                    'tujuan_1_berangkat_ke' => 'Samarinda',
                    'tujuan_1_berangkat_tanggal' => $today,
                    'tujuan_1_berangkat_kepala_jabatan' => '',
                    'tujuan_1_berangkat_kepala_nama' => '',
                    'tujuan_1_berangkat_kepala_nip' => '',
                    'tujuan_1_berangkat_id_type' => 'NIP',
                    'transit_3' => [],
                    'transit_4' => [],
                    'transit_5' => [],
                    'kembali_tempat' => 'Samarinda',
                    'kembali_tanggal' => $today,
                    'kembali_jabatan_pengesah' => 'Pejabat Pembuat Komitmen,',
                    'kembali_nama_pejabat' => $dipaPpk['name'],
                    'kembali_nip_pejabat' => $dipaPpk['nip'],
                    'ppk_jabatan' => 'Pejabat Pembuat Komitmen,',
                    'ppk_nama' => $dipaPpk['name'],
                    'ppk_nip' => $dipaPpk['nip'],
                    'ppk_keterangan' => 'Telah diperiksa dengan keterangan bahwa perjalanan tersebut atas perintahnya dan semata-mata untuk kepentingan jabatan dalam waktu yang sesingkat-singkatnya.',
                    'catatan_lain' => '',
                ],
            ],
            [
                'name' => '[DIPA] SKW I Berau',
                'description' => 'Template SPD DIPA Seksi Konservasi Wilayah I Berau',
                'is_default' => false,
                'auto_today_date' => true,
                'data' => [
                    'spd_type' => 'dipa',
                    'asal_tempat' => 'Berau',
                    'asal_tanggal' => $today,
                    'tujuan_awal' => '',
                    'asal_jabatan_pengesah' => $settings['berau']['depart_position_dipa'] ?? 'Kepala Seksi Konservasi Sumber Daya Alam Wilayah I,',
                    'asal_nama_pejabat' => $settings['berau']['official_name'] ?? 'Yulian Sadono, S.Hut., M.T.',
                    'asal_nip_pejabat' => $settings['berau']['official_nip'] ?? '19800707 200604 1 003',
                    'tujuan_1_tempat' => '',
                    'tujuan_1_tiba_tanggal' => $today,
                    'tujuan_1_kepala_jabatan' => '',
                    'tujuan_1_kepala_nama' => '',
                    'tujuan_1_kepala_nip' => '',
                    'tujuan_1_id_type' => 'NIP',
                    'tujuan_1_berangkat_dari' => '',
                    'tujuan_1_berangkat_ke' => 'Berau',
                    'tujuan_1_berangkat_tanggal' => $today,
                    'tujuan_1_berangkat_kepala_jabatan' => '',
                    'tujuan_1_berangkat_kepala_nama' => '',
                    'tujuan_1_berangkat_kepala_nip' => '',
                    'tujuan_1_berangkat_id_type' => 'NIP',
                    'transit_3' => [],
                    'transit_4' => [],
                    'transit_5' => [],
                    'kembali_tempat' => 'Berau',
                    'kembali_tanggal' => $today,
                    'kembali_jabatan_pengesah' => 'Pejabat Pembuat Komitmen,',
                    'kembali_nama_pejabat' => $dipaPpk['name'],
                    'kembali_nip_pejabat' => $dipaPpk['nip'],
                    'ppk_jabatan' => 'Pejabat Pembuat Komitmen,',
                    'ppk_nama' => $dipaPpk['name'],
                    'ppk_nip' => $dipaPpk['nip'],
                    'ppk_keterangan' => 'Telah diperiksa dengan keterangan bahwa perjalanan tersebut atas perintahnya dan semata-mata untuk kepentingan jabatan dalam waktu yang sesingkat-singkatnya.',
                    'catatan_lain' => '',
                ],
            ],
            [
                'name' => '[DIPA] SKW II Tenggarong',
                'description' => 'Template SPD DIPA Seksi Konservasi Wilayah II Tenggarong ke Tenggarong Seberang',
                'is_default' => false,
                'auto_today_date' => true,
                'data' => [
                    'spd_type' => 'dipa',
                    'asal_tempat' => 'Tenggarong, Kab. Kukar',
                    'asal_tanggal' => $today,
                    'tujuan_awal' => 'Kec. Tenggarong Seberang',
                    'asal_jabatan_pengesah' => $settings['tenggarong']['depart_position_dipa'] ?? 'Kepala Seksi Konservasi Sumber Daya Alam Wilayah II,',
                    'asal_nama_pejabat' => $settings['tenggarong']['official_name'] ?? 'SURIAWATI HALIM, S.Hut., M.P.',
                    'asal_nip_pejabat' => $settings['tenggarong']['official_nip'] ?? '19751127 200003 2 001',
                    'tujuan_1_tempat' => 'Kec. Tenggarong Seberang',
                    'tujuan_1_tiba_tanggal' => $today,
                    'tujuan_1_kepala_jabatan' => "Ketua RT. 15\nDesa Suka Maju",
                    'tujuan_1_kepala_nama' => 'SUHENDRA',
                    'tujuan_1_kepala_nip' => '',
                    'tujuan_1_id_type' => 'NIP',
                    'tujuan_1_berangkat_dari' => 'Kec. Tenggarong Seberang',
                    'tujuan_1_berangkat_ke' => 'Tenggarong, Kab. Kukar',
                    'tujuan_1_berangkat_tanggal' => $today,
                    'tujuan_1_berangkat_kepala_jabatan' => "Ketua RT. 15\nDesa Suka Maju",
                    'tujuan_1_berangkat_kepala_nama' => 'SUHENDRA',
                    'tujuan_1_berangkat_kepala_nip' => '',
                    'tujuan_1_berangkat_id_type' => 'NIP',
                    'transit_3' => [],
                    'transit_4' => [],
                    'transit_5' => [],
                    'kembali_tempat' => 'Tenggarong, Kab. Kukar',
                    'kembali_tanggal' => $today,
                    'kembali_jabatan_pengesah' => 'Pejabat Pembuat Komitmen,',
                    'kembali_nama_pejabat' => $dipaPpk['name'],
                    'kembali_nip_pejabat' => $dipaPpk['nip'],
                    'ppk_jabatan' => 'Pejabat Pembuat Komitmen,',
                    'ppk_nama' => $dipaPpk['name'],
                    'ppk_nip' => $dipaPpk['nip'],
                    'ppk_keterangan' => 'Telah diperiksa dengan keterangan bahwa perjalanan tersebut atas perintahnya dan semata-mata untuk kepentingan jabatan dalam waktu yang sesingkat-singkatnya.',
                    'catatan_lain' => '',
                ],
            ],
            [
                'name' => '[DIPA] SKW III Balikpapan',
                'description' => 'Template SPD DIPA Seksi Konservasi Wilayah III Balikpapan',
                'is_default' => false,
                'auto_today_date' => true,
                'data' => [
                    'spd_type' => 'dipa',
                    'asal_tempat' => 'Balikpapan',
                    'asal_tanggal' => $today,
                    'tujuan_awal' => '',
                    'asal_jabatan_pengesah' => $settings['balikpapan']['depart_position_dipa'] ?? 'Kepala Seksi Konservasi Sumber Daya Alam Wilayah III,',
                    'asal_nama_pejabat' => $settings['balikpapan']['official_name'] ?? 'Bambang Hari Trimarsito, S.Si., M.P.',
                    'asal_nip_pejabat' => $settings['balikpapan']['official_nip'] ?? '19740626 200112 1 004',
                    'tujuan_1_tempat' => '',
                    'tujuan_1_tiba_tanggal' => $today,
                    'tujuan_1_kepala_jabatan' => '',
                    'tujuan_1_kepala_nama' => '',
                    'tujuan_1_kepala_nip' => '',
                    'tujuan_1_id_type' => 'NIP',
                    'tujuan_1_berangkat_dari' => '',
                    'tujuan_1_berangkat_ke' => 'Balikpapan',
                    'tujuan_1_berangkat_tanggal' => $today,
                    'tujuan_1_berangkat_kepala_jabatan' => '',
                    'tujuan_1_berangkat_kepala_nama' => '',
                    'tujuan_1_berangkat_kepala_nip' => '',
                    'tujuan_1_berangkat_id_type' => 'NIP',
                    'transit_3' => [],
                    'transit_4' => [],
                    'transit_5' => [],
                    'kembali_tempat' => 'Balikpapan',
                    'kembali_tanggal' => $today,
                    'kembali_jabatan_pengesah' => 'Pejabat Pembuat Komitmen,',
                    'kembali_nama_pejabat' => $dipaPpk['name'],
                    'kembali_nip_pejabat' => $dipaPpk['nip'],
                    'ppk_jabatan' => 'Pejabat Pembuat Komitmen,',
                    'ppk_nama' => $dipaPpk['name'],
                    'ppk_nip' => $dipaPpk['nip'],
                    'ppk_keterangan' => 'Telah diperiksa dengan keterangan bahwa perjalanan tersebut atas perintahnya dan semata-mata untuk kepentingan jabatan dalam waktu yang sesingkat-singkatnya.',
                    'catatan_lain' => '',
                ],
            ],
            [
                'name' => '[FOLU] Balai Samarinda',
                'description' => 'Template SPD FOLU Net Sink 2030 Balai Samarinda',
                'is_default' => false,
                'auto_today_date' => true,
                'data' => [
                    'spd_type' => 'folu',
                    'asal_tempat' => 'Samarinda',
                    'asal_tanggal' => $today,
                    'tujuan_awal' => '',
                    'asal_jabatan_pengesah' => $settings['samarinda']['depart_position_folu'] ?? "a.n. Kepala Balai\nKepala Subbagian Tata Usaha",
                    'asal_nama_pejabat' => $settings['samarinda']['official_name'] ?? 'Dheny Mardiono, S.Hut., MSc.',
                    'asal_nip_pejabat' => $settings['samarinda']['official_nip'] ?? '19750314 199903 1 004',
                    'tujuan_1_tempat' => '',
                    'tujuan_1_tiba_tanggal' => $today,
                    'tujuan_1_kepala_jabatan' => '',
                    'tujuan_1_kepala_nama' => '',
                    'tujuan_1_kepala_nip' => '',
                    'tujuan_1_id_type' => 'NIP',
                    'tujuan_1_berangkat_dari' => '',
                    'tujuan_1_berangkat_ke' => 'Samarinda',
                    'tujuan_1_berangkat_tanggal' => $today,
                    'tujuan_1_berangkat_kepala_jabatan' => '',
                    'tujuan_1_berangkat_kepala_nama' => '',
                    'tujuan_1_berangkat_kepala_nip' => '',
                    'tujuan_1_berangkat_id_type' => 'NIP',
                    'transit_3' => [],
                    'transit_4' => [],
                    'transit_5' => [],
                    'kembali_tempat' => 'Samarinda',
                    'kembali_tanggal' => $today,
                    'kembali_jabatan_pengesah' => $settings['samarinda']['return_position'] ?? 'Kepala Subbagian Tata Usaha',
                    'kembali_nama_pejabat' => $settings['samarinda']['official_name'] ?? 'Dheny Mardiono, S.Hut., MSc.',
                    'kembali_nip_pejabat' => $settings['samarinda']['official_nip'] ?? '19750314 199903 1 004',
                    'ppk_jabatan' => 'Pejabat Pembuat Komitmen,',
                    'ppk_nama' => $foluPpk['name'],
                    'ppk_nip' => $foluPpk['nip'],
                    'ppk_keterangan' => 'Telah diperiksa dengan keterangan bahwa perjalanan tersebut atas perintahnya dan semata-mata untuk kepentingan jabatan dalam waktu yang sesingkat-singkatnya.',
                    'catatan_lain' => '',
                ],
            ],
            [
                'name' => '[FOLU] SKW I Berau',
                'description' => 'Template SPD FOLU Net Sink 2030 Seksi Wilayah I Berau',
                'is_default' => false,
                'auto_today_date' => true,
                'data' => [
                    'spd_type' => 'folu',
                    'asal_tempat' => 'Berau',
                    'asal_tanggal' => $today,
                    'tujuan_awal' => '',
                    'asal_jabatan_pengesah' => $settings['berau']['depart_position_folu'] ?? "a.n. Kepala Balai\nKepala Seksi Konservasi Sumber\nDaya Alam Wilayah I",
                    'asal_nama_pejabat' => $settings['berau']['official_name'] ?? 'Yulian Sadono, S.Hut., M.T.',
                    'asal_nip_pejabat' => $settings['berau']['official_nip'] ?? '19800707 200604 1 003',
                    'tujuan_1_tempat' => '',
                    'tujuan_1_tiba_tanggal' => $today,
                    'tujuan_1_kepala_jabatan' => '',
                    'tujuan_1_kepala_nama' => '',
                    'tujuan_1_kepala_nip' => '',
                    'tujuan_1_id_type' => 'NIP',
                    'tujuan_1_berangkat_dari' => '',
                    'tujuan_1_berangkat_ke' => 'Berau',
                    'tujuan_1_berangkat_tanggal' => $today,
                    'tujuan_1_berangkat_kepala_jabatan' => '',
                    'tujuan_1_berangkat_kepala_nama' => '',
                    'tujuan_1_berangkat_kepala_nip' => '',
                    'tujuan_1_berangkat_id_type' => 'NIP',
                    'transit_3' => [],
                    'transit_4' => [],
                    'transit_5' => [],
                    'kembali_tempat' => 'Berau',
                    'kembali_tanggal' => $today,
                    'kembali_jabatan_pengesah' => $settings['berau']['return_position'] ?? 'Kepala Seksi Konservasi Sumber Daya Alam Wilayah I',
                    'kembali_nama_pejabat' => $settings['berau']['official_name'] ?? 'Yulian Sadono, S.Hut., M.T.',
                    'kembali_nip_pejabat' => $settings['berau']['official_nip'] ?? '19800707 200604 1 003',
                    'ppk_jabatan' => 'Pejabat Pembuat Komitmen,',
                    'ppk_nama' => $foluPpk['name'],
                    'ppk_nip' => $foluPpk['nip'],
                    'ppk_keterangan' => 'Telah diperiksa dengan keterangan bahwa perjalanan tersebut atas perintahnya dan semata-mata untuk kepentingan jabatan dalam waktu yang sesingkat-singkatnya.',
                    'catatan_lain' => '',
                ],
            ],
            [
                'name' => '[FOLU] SKW III Balikpapan',
                'description' => 'Template SPD FOLU Net Sink 2030 Seksi Wilayah III Balikpapan',
                'is_default' => false,
                'auto_today_date' => true,
                'data' => [
                    'spd_type' => 'folu',
                    'asal_tempat' => 'Balikpapan',
                    'asal_tanggal' => $today,
                    'tujuan_awal' => '',
                    'asal_jabatan_pengesah' => $settings['balikpapan']['depart_position_folu'] ?? "a.n. Kepala Balai\nKepala Seksi Konservasi Sumber\nDaya Alam Wilayah III",
                    'asal_nama_pejabat' => $settings['balikpapan']['official_name'] ?? 'Bambang Hari Trimarsito, S.Si., M.P.',
                    'asal_nip_pejabat' => $settings['balikpapan']['official_nip'] ?? '19740626 200112 1 004',
                    'tujuan_1_tempat' => '',
                    'tujuan_1_tiba_tanggal' => $today,
                    'tujuan_1_kepala_jabatan' => '',
                    'tujuan_1_kepala_nama' => '',
                    'tujuan_1_kepala_nip' => '',
                    'tujuan_1_id_type' => 'NIP',
                    'tujuan_1_berangkat_dari' => '',
                    'tujuan_1_berangkat_ke' => 'Balikpapan',
                    'tujuan_1_berangkat_tanggal' => $today,
                    'tujuan_1_berangkat_kepala_jabatan' => '',
                    'tujuan_1_berangkat_kepala_nama' => '',
                    'tujuan_1_berangkat_kepala_nip' => '',
                    'tujuan_1_berangkat_id_type' => 'NIP',
                    'transit_3' => [],
                    'transit_4' => [],
                    'transit_5' => [],
                    'kembali_tempat' => 'Balikpapan',
                    'kembali_tanggal' => $today,
                    'kembali_jabatan_pengesah' => $settings['balikpapan']['return_position'] ?? 'Kepala Seksi Konservasi Sumber Daya Alam Wilayah III',
                    'kembali_nama_pejabat' => $settings['balikpapan']['official_name'] ?? 'Bambang Hari Trimarsito, S.Si., M.P.',
                    'kembali_nip_pejabat' => $settings['balikpapan']['official_nip'] ?? '19740626 200112 1 004',
                    'ppk_jabatan' => 'Pejabat Pembuat Komitmen,',
                    'ppk_nama' => $foluPpk['name'],
                    'ppk_nip' => $foluPpk['nip'],
                    'ppk_keterangan' => 'Telah diperiksa dengan keterangan bahwa perjalanan tersebut atas perintahnya dan semata-mata untuk kepentingan jabatan dalam waktu yang sesingkat-singkatnya.',
                    'catatan_lain' => '',
                ],
            ],
        ];

        foreach ($defaultTemplates as $dt) {
            $exists = VisumSpdTemplate::where('name', $dt['name'])->exists();
            if (! $exists) {
                VisumSpdTemplate::create($dt);
            }
        }

        // Normalize any template names with duplicate prefixes in DB
        foreach (VisumSpdTemplate::all() as $t) {
            $cleaned = preg_replace('/^(\[(DIPA|FOLU|UMUM)\]\s*)+/i', '[$2] ', $t->name);
            $cleaned = preg_replace('/\s*\(DIPA\)$/i', '', $cleaned);
            if ($cleaned !== $t->name) {
                $t->update(['name' => $cleaned]);
            }
        }

        $templates = VisumSpdTemplate::orderBy('is_default', 'desc')
            ->orderBy('id', 'asc')
            ->get();

        return response()->json([
            'success' => true,
            'data' => $templates,
        ]);
    }

    /**
     * Store a new Visum SPD template.
     */
    public function storeTemplate(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'name' => 'required|string|max:255',
            'description' => 'nullable|string|max:500',
            'is_default' => 'nullable|boolean',
            'auto_today_date' => 'nullable|boolean',
            'data' => 'required|array',
        ]);

        $isDefault = $validated['is_default'] ?? false;

        DB::transaction(function () use ($isDefault, $validated, &$template, $request) {
            if ($isDefault) {
                VisumSpdTemplate::query()->update(['is_default' => false]);
            }

            $template = VisumSpdTemplate::create([
                'name' => $validated['name'],
                'description' => $validated['description'] ?? null,
                'is_default' => $isDefault,
                'auto_today_date' => $validated['auto_today_date'] ?? true,
                'data' => $validated['data'],
                'created_by' => $request->user()?->id,
            ]);
        });

        return response()->json([
            'success' => true,
            'message' => 'Template Visum SPD berhasil disimpan.',
            'data' => $template,
        ], 201);
    }

    /**
     * Update an existing Visum SPD template.
     */
    public function updateTemplate(Request $request, int $id): JsonResponse
    {
        $template = VisumSpdTemplate::findOrFail($id);

        $validated = $request->validate([
            'name' => 'required|string|max:255',
            'description' => 'nullable|string|max:500',
            'is_default' => 'nullable|boolean',
            'auto_today_date' => 'nullable|boolean',
            'data' => 'required|array',
        ]);

        $isDefault = $validated['is_default'] ?? $template->is_default;

        DB::transaction(function () use ($isDefault, $validated, $template) {
            if ($isDefault && ! $template->is_default) {
                VisumSpdTemplate::query()->update(['is_default' => false]);
            }

            $template->update([
                'name' => $validated['name'],
                'description' => $validated['description'] ?? null,
                'is_default' => $isDefault,
                'auto_today_date' => $validated['auto_today_date'] ?? true,
                'data' => $validated['data'],
            ]);
        });

        return response()->json([
            'success' => true,
            'message' => 'Template Visum SPD berhasil diperbarui.',
            'data' => $template->fresh(),
        ]);
    }

    /**
     * Duplicate a Visum SPD template.
     */
    public function duplicateTemplate(int $id): JsonResponse
    {
        $template = VisumSpdTemplate::findOrFail($id);

        $newTemplate = VisumSpdTemplate::create([
            'name' => $template->name . ' (Salinan)',
            'description' => $template->description,
            'is_default' => false,
            'auto_today_date' => $template->auto_today_date,
            'data' => $template->data,
            'created_by' => auth()->id(),
        ]);

        return response()->json([
            'success' => true,
            'message' => 'Template berhasil diduplikasi.',
            'data' => $newTemplate,
        ], 201);
    }

    /**
     * Delete a Visum SPD template.
     */
    public function deleteTemplate(int $id): JsonResponse
    {
        $template = VisumSpdTemplate::findOrFail($id);
        $wasDefault = $template->is_default;

        $template->delete();

        // If default was deleted, assign the oldest remaining template as default
        if ($wasDefault) {
            $nextDefault = VisumSpdTemplate::first();
            if ($nextDefault) {
                $nextDefault->update(['is_default' => true]);
            }
        }

        return response()->json([
            'success' => true,
            'message' => 'Template berhasil dihapus.',
        ]);
    }

    /**
     * Set a template as default.
     */
    public function setDefaultTemplate(int $id): JsonResponse
    {
        $template = VisumSpdTemplate::findOrFail($id);

        DB::transaction(function () use ($template) {
            VisumSpdTemplate::query()->update(['is_default' => false]);
            $template->update(['is_default' => true]);
        });

        return response()->json([
            'success' => true,
            'message' => "Template '{$template->name}' ditetapkan sebagai template default.",
            'data' => $template->fresh(),
        ]);
    }
}
