<?php

namespace Tests\Feature;

use App\Models\User;
use App\Modules\Keuangan\Services\SpjDipaExcelService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use PhpOffice\PhpSpreadsheet\IOFactory;
use Tests\TestCase;

class KeuanganSpjDipaExcelTest extends TestCase
{
    use RefreshDatabase;

    protected User $user;

    protected function setUp(): void
    {
        parent::setUp();
        $this->user = User::factory()->create([
            'username' => 'testadmin_' . uniqid(),
            'role' => 'admin',
            'access_modules' => ['keuangan'],
        ]);
        Sanctum::actingAs($this->user);
    }

    public function test_spj_dipa_excel_service_generates_valid_workbook(): void
    {
        $service = new SpjDipaExcelService();

        $payload = [
            'tipe_anggaran' => 'DIPA',
            'nomor_spt' => 'ST.920/K.18/TU/KSA.02.02/B/08/2026',
            'nama_kegiatan' => 'Supervisi Pengendalian Kebakaran Hutan dan Lahan di CA Teluk Apar',
            'asal' => 'Samarinda',
            'tujuan' => 'Kab. Paser',
            'tanggal_mulai' => '2026-08-30',
            'tanggal_selesai' => '2026-09-02',
            'total_anggaran' => 6434800,
            'spdNumber' => [
                'no' => '123',
                'suffix' => '/K.18-TU/KEU/08/2026',
            ],
            'spbNumber' => [
                'no' => '456',
                'suffix' => '/SPBy/K.18/08/2026',
            ],
            'dipaConfig' => [
                'kodeSatker' => '143.04.16.693614',
                'namaSatker' => 'Balai Konservasi Sumber Daya Alam Kalimantan Timur',
                'noSpDipa' => 'No. SP DIPA- 143.04.2.693614/2025 Tanggal 23 Desember 2025',
                'klasifikasiMak' => '7273.REA.003.524111',
                'kodeMak' => '051.E.770.771.772',
                'makDescription' => 'Uang Harian, Penginapan, Transportasi',
                'spdDate' => '28 Agustus 2026',
            ],
            'pejabat_ppk' => [
                'name' => 'RUSMANTO, S.Hut',
                'nik' => '19810907 200012 1 004',
            ],
            'pejabat_pdo' => [
                'name' => 'SOERENDENG, SE',
                'nik' => '19790721 200701 2 001',
            ],
            'recipients' => [
                [
                    'id' => 'emp-1',
                    'name' => 'M. ARI WIBAWANTO, S.Hut., M.Sc.',
                    'nip' => '19740514 199903 1 001',
                    'rank' => 'Pembina Tingkat I (IV/b)',
                    'position' => 'Kepala Balai',
                    'amount' => 3991200,
                    'dipa' => [
                        'uangHarianRate' => 430000,
                        'uangHarianDays' => 4,
                        'transportUdara' => 0,
                        'taksiPp' => 274000,
                        'penginapanRate' => 452100,
                        'penginapanNights' => 3,
                        'dpRilEnabled' => true,
                        'dpRilProvince' => 'Provinsi Kalimantan Timur',
                        'extraItems' => [
                            ['label' => 'Ferry Kariangau - Penajam (PP)', 'amount' => 640900],
                        ],
                    ],
                ],
                [
                    'id' => 'emp-2',
                    'name' => 'TAUFIK RAHMAN',
                    'nip' => '19840428 202521 1 065',
                    'rank' => 'V',
                    'position' => 'Manggala Agni Pemula',
                    'amount' => 2443600,
                    'dipa' => [
                        'uangHarianRate' => 430000,
                        'uangHarianDays' => 4,
                        'transportUdara' => 0,
                        'taksiPp' => 0,
                        'penginapanRate' => 241200,
                        'penginapanNights' => 3,
                        'dpRilEnabled' => true,
                        'dpRilProvince' => 'Provinsi Kalimantan Timur',
                    ],
                ],
            ],
        ];

        $filePath = $service->generate($payload);

        $this->assertFileExists($filePath);

        $spreadsheet = IOFactory::load($filePath);
        $sheetNames = $spreadsheet->getSheetNames();

        // Check required DIPA sheets
        $this->assertContains('SPT Panduan', $sheetNames);
        $this->assertContains('Nominatif PD(wajib diisi n ttd)', $sheetNames);
        $this->assertContains('SPTB', $sheetNames);
        $this->assertContains('SPBy', $sheetNames);
        $this->assertContains('Rinba', $sheetNames);
        $this->assertContains('DP Ril', $sheetNames);
        $this->assertContains('spd', $sheetNames);

        // Belakang should be removed
        $this->assertNotContains('BELAKANG', $sheetNames);

        // Verify some cells in SPT Panduan
        $wsPanduan = $spreadsheet->getSheetByName('SPT Panduan');
        $this->assertEquals('ST.920/K.18/TU/KSA.02.02/B/08/2026', $wsPanduan->getCell('G2')->getValue());
        $this->assertEquals('M. ARI WIBAWANTO, S.Hut., M.Sc.', $wsPanduan->getCell('G6')->getValue());
        $this->assertEquals('TAUFIK RAHMAN', $wsPanduan->getCell('G11')->getValue());

        // Verify Nominatif
        $wsNom = $spreadsheet->getSheetByName('Nominatif PD(wajib diisi n ttd)');
        $this->assertEquals('M. ARI WIBAWANTO, S.Hut., M.Sc.', $wsNom->getCell('B8')->getValue());

        // Verify SPTB
        $wsSptb = $spreadsheet->getSheetByName('SPTB');
        $this->assertEquals('M. ARI WIBAWANTO, S.Hut., M.Sc., Dkk', $wsSptb->getCell('B12')->getValue());

        // Verify DP Ril
        $wsDpRil = $spreadsheet->getSheetByName('DP Ril');
        $this->assertEquals('M. ARI WIBAWANTO, S.Hut., M.Sc.', $wsDpRil->getCell('E5')->getValue());

        // Verify SPBy sheet
        $wsSpby = $spreadsheet->getSheetByName('SPBy');
        $this->assertStringContainsString('Belanja Perjalanan Dinas Biasa, Perjalanan Dinas dari Samarinda ke Kab. Paser sebanyak 2 (Dua) orang tugas (OT)', (string) $wsSpby->getCell('E17')->getValue());

        // Verify SPD sheet
        $wsSpd = $spreadsheet->getSheetByName('spd');
        $this->assertEquals('Perjalanan Dinas dari Samarinda ke Kab. Paser dalam rangka Supervisi Pengendalian Kebakaran Hutan dan Lahan di CA Teluk Apar', $wsSpd->getCell('E18')->getValue());
        $this->assertEquals('Dikeluarkan di', $wsSpd->getCell('F38')->getValue());
        $this->assertEquals(':', $wsSpd->getCell('G38')->getValue());
        $this->assertEquals('Samarinda', $wsSpd->getCell('H38')->getValue());
        $this->assertEquals('Pada tanggal', $wsSpd->getCell('F39')->getValue());
        $this->assertEquals(':', $wsSpd->getCell('G39')->getValue());
        $this->assertEquals('Pejabat Pembuat Komitmen,', $wsSpd->getCell('F41')->getValue());
        $this->assertEquals('RUSMANTO, S.Hut', $wsSpd->getCell('F45')->getValue());
        $this->assertEquals('thin', $wsSpd->getStyle('A12:I12')->getBorders()->getBottom()->getBorderStyle());
        $this->assertEquals('thin', $wsSpd->getStyle('A18:I18')->getBorders()->getBottom()->getBorderStyle());
        $this->assertEquals('thin', $wsSpd->getStyle('A36:I36')->getBorders()->getBottom()->getBorderStyle());

        $spreadsheet->disconnectWorksheets();
        unset($spreadsheet);
        @unlink($filePath);
    }

    public function test_export_excel_endpoint_supports_dipa(): void
    {
        $payload = [
            'tipe_anggaran' => 'DIPA',
            'nomor_spt' => 'ST.920/DIPA/2026',
            'nama_kegiatan' => 'Perjalanan Dinas DIPA',
            'asal' => 'Samarinda',
            'tujuan' => 'Balikpapan',
            'tanggal_mulai' => '2026-08-30',
            'tanggal_selesai' => '2026-09-02',
            'total_anggaran' => 2000000,
            'recipients' => [
                [
                    'id' => 'emp-1',
                    'name' => 'M. ARI WIBAWANTO, S.Hut., M.Sc.',
                    'nip' => '19740514 199903 1 001',
                    'amount' => 2000000,
                ],
            ],
        ];

        $response = $this->postJson('/api/keuangan/spj/export-excel', $payload);

        $response->assertStatus(200);
        $this->assertTrue(str_contains(
            $response->headers->get('content-type'),
            'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
        ));
    }

    public function test_spj_dipa_excel_service_itemizes_transport_in_rinba_and_links_to_nominatif(): void
    {
        $service = new SpjDipaExcelService();

        $payload = [
            'tipe_anggaran' => 'DIPA',
            'nomor_spt' => 'ST.920/K.18/TU/KSA.02.02/B/08/2026',
            'nama_kegiatan' => 'Supervisi Pengendalian Kebakaran Hutan dan Lahan di CA Teluk Apar',
            'asal' => 'Samarinda',
            'tujuan' => 'Kab. Paser',
            'tanggal_mulai' => '2026-08-30',
            'tanggal_selesai' => '2026-09-02',
            'total_anggaran' => 6434800,
            'recipients' => [
                [
                    'id' => 'emp-1',
                    'name' => 'M. ARI WIBAWANTO, S.Hut., M.Sc.',
                    'nip' => '19740514 199903 1 001',
                    'amount' => 3991200,
                    'dipa' => [
                        'uangHarianRate' => 430000,
                        'uangHarianDays' => 4,
                        'transportItems' => [
                            ['category' => 'darat', 'label' => 'Tol Samarinda - Balikpapan (PP)', 'amount' => 274000],
                            ['category' => 'darat', 'label' => 'Ferry Kariangau - Penajam (PP)', 'amount' => 640900],
                            ['category' => 'udara', 'label' => 'Tiket Pesawat Garuda PP', 'amount' => 2500000],
                        ],
                        'penginapanRate' => 452100,
                        'penginapanNights' => 3,
                    ],
                ],
            ],
        ];

        $filePath = $service->generate($payload);
        $this->assertFileExists($filePath);

        $spreadsheet = IOFactory::load($filePath);
        $wsRinba = $spreadsheet->getSheetByName('Rinba');

        // Check Rinba Row 11: Tol
        $this->assertEquals(274000, $wsRinba->getCell('E11')->getValue());
        $this->assertEquals('Tol Samarinda - Balikpapan (PP)', $wsRinba->getCell('H11')->getValue());

        // Check Rinba Row 12: Ferry
        $this->assertEquals(640900, $wsRinba->getCell('E12')->getValue());
        $this->assertEquals('Ferry Kariangau - Penajam (PP)', $wsRinba->getCell('H12')->getValue());

        // Check Rinba Row 13: Pesawat
        $this->assertEquals(2500000, $wsRinba->getCell('E13')->getValue());
        $this->assertEquals('Tiket Pesawat Garuda PP', $wsRinba->getCell('H13')->getValue());

        // Check Nominatif links
        $wsNom = $spreadsheet->getSheetByName('Nominatif PD(wajib diisi n ttd)');
        $this->assertEquals('=Rinba!E13', $wsNom->getCell('H8')->getValue());
        $this->assertEquals('=Rinba!E11+Rinba!E12', $wsNom->getCell('I8')->getValue());
        $this->assertEquals('=H8+I8', $wsNom->getCell('J8')->getValue());
    }

    public function test_numeric_nip_and_account_no_are_prefixed_with_quote(): void
    {
        $foluService = new \App\Modules\Keuangan\Services\SpjFoluExcelService();
        $payloadFolu = [
            'tipe_anggaran' => 'FOLU',
            'nomor_spt' => 'ST.980/K.18/TU/FOLU.NC-23/KSA.0X.0X/B/09/2026',
            'recipients' => [
                [
                    'id' => 'emp-1',
                    'name' => 'Achmad Syafey N',
                    'nip' => '200009222024211000',
                    'rank' => '(V)',
                    'position' => 'Pengendali Ekosistem Hutan Pemula',
                    'type' => 'pegawai',
                    'accountNo' => '12345678901234',
                ],
                [
                    'id' => 'emp-2',
                    'name' => 'Tegar Anugrah, A.Md.Kom.',
                    'nip' => '199501012022011001',
                    'rank' => 'Pengatur (II/c)',
                    'position' => 'Pranata Komputer Terampil',
                    'type' => 'pegawai',
                    'accountNo' => '98765432109876',
                ],
            ],
            'spbConfig' => [
                'virtualAccount' => '8801234567890123',
            ],
        ];

        $tempPath = $foluService->generate($payloadFolu);
        $spreadsheet = IOFactory::load($tempPath);
        $wsSt = $spreadsheet->getSheetByName('SPT Panduan');

        // G7 should be prefixed with ' and be string type
        $cellG7 = $wsSt->getCell('G7');
        $this->assertEquals("'200009222024211000", $cellG7->getValue());
        $this->assertEquals('s', $cellG7->getDataType());

        // Daftar Isian accountNo should also have '
        $wsDaftar = $spreadsheet->getSheetByName('Daftar Isian');
        $cellC12 = $wsDaftar->getCell('C12');
        $this->assertEquals("'12345678901234", $cellC12->getValue());
        $this->assertEquals('s', $cellC12->getDataType());

        // SPB virtualAccount should also have '
        $wsSpb = $spreadsheet->getSheetByName('SPB');
        $cellD15 = $wsSpb->getCell('D15');
        $this->assertEquals("'8801234567890123", $cellD15->getValue());
        $this->assertEquals('s', $cellD15->getDataType());

        @unlink($tempPath);
    }
}
