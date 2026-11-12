<?php

namespace Tests\Feature;

use App\Models\User;
use App\Modules\DeReporting\Models\Anggaran;
use App\Modules\DeReporting\Models\Bidang;
use App\Modules\DeReporting\Models\Internal;
use App\Modules\DeReporting\Models\Jenis;
use App\Modules\DeReporting\Models\JenisData;
use App\Modules\DeReporting\Models\Kategori;
use App\Modules\DeReporting\Models\Tahun;
use App\Modules\Kepegawaian\Models\Employee;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Storage;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class DeReportingInternalRBACTest extends TestCase
{
    use RefreshDatabase;

    private User $admin;
    private User $userKepegawaian;
    private User $userKeuangan;
    private User $userWilayah;

    private Tahun $tahun;
    private Bidang $bidang;
    private Jenis $jenis;
    private Kategori $kategori;
    private JenisData $jenisData;

    protected function setUp(): void
    {
        parent::setUp();
        Storage::fake('local');

        // Master Data DeReporting
        $this->tahun = Tahun::create(['tahun' => 2026, 'is_active' => true]);
        $this->bidang = Bidang::create(['nama' => 'DATA TSL']);
        $this->jenis = Jenis::create(['bidang_id' => $this->bidang->id, 'nama' => 'Laporan Bulanan']);
        $this->kategori = Kategori::create(['jenis_id' => $this->jenis->id, 'nama' => 'Lain-Lain']);
        $this->jenisData = JenisData::create(['kategori_id' => $this->kategori->id, 'nama' => 'Laporan Kegiatan']);

        // 1. Super Admin
        $this->admin = User::create([
            'name' => 'Super Administrator',
            'username' => '198001012005011001',
            'email' => 'admin@bksda.local',
            'password' => Hash::make('password'),
            'role' => 'super_admin',
            'access_modules' => ['dereporting', 'kepegawaian'],
        ]);

        // 2. User Urusan Kepegawaian
        $this->userKepegawaian = User::create([
            'name' => 'Staf Kepegawaian',
            'username' => '199001012015011001',
            'email' => 'kepegawaian@bksda.local',
            'password' => Hash::make('password'),
            'role' => 'user',
            'access_modules' => ['dereporting'],
        ]);
        Employee::create([
            'nip' => '199001012015011001',
            'nama_lengkap' => 'Staf Kepegawaian',
            'satuan_kerja' => 'Balai BKSDA Kalimantan Timur',
            'resor' => 'Urusan Kepegawaian & Umum',
            'is_active' => true,
        ]);

        // 3. User Urusan Keuangan & BMN
        $this->userKeuangan = User::create([
            'name' => 'Staf Keuangan',
            'username' => '199202022018021002',
            'email' => 'keuangan@bksda.local',
            'password' => Hash::make('password'),
            'role' => 'user',
            'access_modules' => ['dereporting'],
        ]);
        Employee::create([
            'nip' => '199202022018021002',
            'nama_lengkap' => 'Staf Keuangan',
            'satuan_kerja' => 'Balai BKSDA Kalimantan Timur',
            'resor' => 'Urusan Keuangan & BMN',
            'is_active' => true,
        ]);

        // 4. User Seksi Wilayah
        $this->userWilayah = User::create([
            'name' => 'Staf Seksi Wilayah',
            'username' => '199303032019031003',
            'email' => 'wilayah@bksda.local',
            'password' => Hash::make('password'),
            'role' => 'user',
            'access_modules' => ['dereporting'],
        ]);
        Employee::create([
            'nip' => '199303032019031003',
            'nama_lengkap' => 'Staf Seksi Wilayah',
            'satuan_kerja' => 'SKW I Berau',
            'resor' => 'Resor Konservasi Wilayah Berau',
            'is_active' => true,
        ]);
    }

    private function createReport(User $uploader, string $judul, string $targetScope = 'all', array $recipients = []): Internal
    {
        $filePath = 'private/dereporting/internals/test-'.fake()->uuid().'.pdf';
        Storage::put($filePath, '%PDF-1.4 sample test content');

        $report = Internal::create([
            'user_id' => $uploader->id,
            'target_scope' => $targetScope,
            'tahun_id' => $this->tahun->id,
            'bidang_id' => $this->bidang->id,
            'jenis_id' => $this->jenis->id,
            'kategori_id' => $this->kategori->id,
            'jenis_data_id' => $this->jenisData->id,
            'judul_laporan' => $judul,
            'keterangan' => 'Keterangan '.$judul,
            'file_path' => $filePath,
            'review_status' => 'terkirim',
        ]);

        foreach ($recipients as $rec) {
            $report->recipients()->create($rec);
        }

        return $report;
    }

    public function test_dr_01_pegawai_kepegawaian_tidak_melihat_laporan_rahasia_keuangan(): void
    {
        // Buat laporan rahasia khusus Urusan Keuangan & BMN oleh Staf Keuangan
        $this->createReport($this->userKeuangan, 'Laporan Keuangan Rahasia', 'restricted', [
            ['recipient_type' => 'urusan', 'urusan_name' => 'Urusan Keuangan & BMN'],
        ]);

        // Staf Kepegawaian login
        Sanctum::actingAs($this->userKepegawaian);
        $res = $this->getJson('/api/dereporting/internals');

        $res->assertOk();
        $titles = collect($res->json('data'))->pluck('judul_laporan');
        $this->assertFalse($titles->contains('Laporan Keuangan Rahasia'), 'Staf Kepegawaian tidak boleh melihat laporan khusus Urusan Keuangan');
    }

    public function test_dr_02_pegawai_melihat_laporan_urusannya(): void
    {
        // Laporan ditujukan ke Urusan Kepegawaian & Umum
        $this->createReport($this->userKeuangan, 'Laporan Rekap Cuti Triwulan', 'restricted', [
            ['recipient_type' => 'urusan', 'urusan_name' => 'Urusan Kepegawaian & Umum'],
        ]);

        Sanctum::actingAs($this->userKepegawaian);
        $res = $this->getJson('/api/dereporting/internals?tab=urusan');

        $res->assertOk();
        $titles = collect($res->json('data'))->pluck('judul_laporan');
        $this->assertTrue($titles->contains('Laporan Rekap Cuti Triwulan'), 'Staf Kepegawaian harus dapat melihat laporan untuk urusannya');
    }

    public function test_dr_03_pegawai_melihat_laporan_personal_lintas_urusan(): void
    {
        // Laporan dari Staf Wilayah khusus ditujukan personal ke Staf Kepegawaian
        $this->createReport($this->userWilayah, 'Laporan Kinerja Individu Khusus', 'restricted', [
            ['recipient_type' => 'user', 'user_id' => $this->userKepegawaian->id],
        ]);

        Sanctum::actingAs($this->userKepegawaian);
        $res = $this->getJson('/api/dereporting/internals?tab=personal');

        $res->assertOk();
        $titles = collect($res->json('data'))->pluck('judul_laporan');
        $this->assertTrue($titles->contains('Laporan Kinerja Individu Khusus'), 'Staf Kepegawaian harus dapat melihat laporan personal dirinya');
    }

    public function test_dr_04_laporan_scope_all_terlihat_oleh_semua_pegawai(): void
    {
        $this->createReport($this->admin, 'Buletin Tahunan BKSDA 2026', 'all');

        Sanctum::actingAs($this->userWilayah);
        $res = $this->getJson('/api/dereporting/internals');

        $res->assertOk();
        $titles = collect($res->json('data'))->pluck('judul_laporan');
        $this->assertTrue($titles->contains('Buletin Tahunan BKSDA 2026'), 'Laporan terbuka harus terlihat oleh semua staf');
    }

    public function test_dr_05_anti_idor_download_dan_preview_ditolak_403_bagi_non_penerima(): void
    {
        $report = $this->createReport($this->userKeuangan, 'Laporan Pajak Rahasia', 'restricted', [
            ['recipient_type' => 'urusan', 'urusan_name' => 'Urusan Keuangan & BMN'],
        ]);

        // Staf Seksi Wilayah mencoba mengunduh langsung via ID (IDOR Attack)
        Sanctum::actingAs($this->userWilayah);
        $resDownload = $this->getJson("/api/dereporting/internals/{$report->id}/download");
        $resDownload->assertForbidden();

        $resPreview = $this->getJson("/api/dereporting/internals/{$report->id}/preview");
        $resPreview->assertForbidden();
    }

    public function test_dr_06_preview_file_otomatis_tandai_read_at(): void
    {
        $report = $this->createReport($this->userWilayah, 'Nota Dinas Konservasi', 'restricted', [
            ['recipient_type' => 'user', 'user_id' => $this->userKeuangan->id],
        ]);

        $recipientRecord = $report->recipients()->first();
        $this->assertNull($recipientRecord->read_at);

        // Staf Keuangan membuka pratinjau
        Sanctum::actingAs($this->userKeuangan);
        $res = $this->get("/api/dereporting/internals/{$report->id}/preview");
        $res->assertOk();
        $this->assertEquals('application/pdf', $res->headers->get('content-type'));

        // Pastikan read_at terisi otomatis
        $recipientRecord->refresh();
        $this->assertNotNull($recipientRecord->read_at, 'Preview dokumen harus otomatis mencatat timestamp read_at');
    }

    public function test_dr_07_review_status_dapat_diperbarui_oleh_penerima(): void
    {
        $report = $this->createReport($this->userWilayah, 'Laporan Evaluasi Sarpras', 'restricted', [
            ['recipient_type' => 'urusan', 'urusan_name' => 'Urusan Keuangan & BMN'],
        ]);

        Sanctum::actingAs($this->userKeuangan);
        $res = $this->putJson("/api/dereporting/internals/{$report->id}/review", [
            'review_status' => 'sesuai',
            'review_notes' => 'Fisik sarpras terkonfirmasi valid.',
        ]);

        $res->assertOk();
        $report->refresh();
        $this->assertEquals('sesuai', $report->review_status);
        $this->assertEquals('Fisik sarpras terkonfirmasi valid.', $report->review_notes);
    }

    public function test_dr_08_super_admin_bypass_melihat_seluruh_laporan(): void
    {
        $this->createReport($this->userKeuangan, 'Laporan Keuangan Internal', 'restricted', [
            ['recipient_type' => 'urusan', 'urusan_name' => 'Urusan Keuangan & BMN'],
        ]);
        $this->createReport($this->userWilayah, 'Laporan Patroli SKW I', 'restricted', [
            ['recipient_type' => 'urusan', 'urusan_name' => 'Resor Konservasi Wilayah Berau'],
        ]);

        Sanctum::actingAs($this->admin);
        $res = $this->getJson('/api/dereporting/internals');

        $res->assertOk();
        $titles = collect($res->json('data'))->pluck('judul_laporan');
        $this->assertTrue($titles->contains('Laporan Keuangan Internal'));
        $this->assertTrue($titles->contains('Laporan Patroli SKW I'));
    }

    public function test_dr_09_store_laporan_restricted_validasi_penerima_berhasil(): void
    {
        Sanctum::actingAs($this->userKepegawaian);

        $fakePdf = UploadedFile::fake()->create('laporan.pdf', 500, 'application/pdf');

        $res = $this->postJson('/api/dereporting/internals', [
            'judul_laporan' => 'Laporan Rekap Absensi Baru',
            'tahun_id' => $this->tahun->id,
            'bidang_id' => $this->bidang->id,
            'jenis_id' => $this->jenis->id,
            'kategori_id' => $this->kategori->id,
            'jenis_data_id' => $this->jenisData->id,
            'target_scope' => 'restricted',
            'recipients' => [
                ['type' => 'urusan', 'urusan_name' => 'Urusan Keuangan & BMN'],
                ['type' => 'user', 'user_id' => $this->userKeuangan->id],
            ],
            'file' => $fakePdf,
        ]);

        $res->assertCreated();
        $this->assertDatabaseHas('dr_internals', [
            'judul_laporan' => 'Laporan Rekap Absensi Baru',
            'target_scope' => 'restricted',
        ]);
        $this->assertDatabaseHas('dr_internal_recipients', [
            'recipient_type' => 'urusan',
            'urusan_name' => 'Urusan Keuangan & BMN',
        ]);
        $this->assertDatabaseHas('dr_internal_recipients', [
            'recipient_type' => 'user',
            'user_id' => $this->userKeuangan->id,
        ]);
    }
}
