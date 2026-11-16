<?php

namespace Tests\Feature;

use App\Models\User;
use App\Modules\Kepegawaian\Models\Employee;
use App\Modules\Kepegawaian\Models\EmployeeLeaveRequest;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class EmployeeLeaveRequestTest extends TestCase
{
    use RefreshDatabase;

    protected User $user;
    protected Employee $employee;

    protected function setUp(): void
    {
        parent::setUp();

        $this->employee = Employee::create([
            'nip' => '199907072025061006',
            'nama_lengkap' => 'TEGAR ANUGRAH, A.Md.Kom.',
            'jabatan' => 'PRANATA KOMPUTER TERAMPIL',
            'satuan_kerja' => 'Balai KSDA Kalimantan Timur',
            'is_active' => true,
        ]);

        $this->user = User::factory()->create([
            'username' => '199907072025061006',
            'role' => 'pegawai',
            'access_modules' => ['kepegawaian'],
        ]);
    }

    public function test_employee_can_submit_leave_request(): void
    {
        $response = $this->actingAs($this->user, 'sanctum')
            ->postJson('/api/me/leave-requests', [
                'jenis_cuti' => 'Cuti Tahunan',
                'alasan_cuti' => 'Perpanjang SIM di Balikpapan',
                'tanggal_mulai' => '2026-06-15',
                'tanggal_selesai' => '2026-06-15',
                'alamat_menjalankan_cuti' => 'Balikpapan',
                'telepon' => '081351458775',
            ]);

        $response->assertStatus(201);
        $response->assertJsonPath('data.jumlah_hari', 1);
        $response->assertJsonPath('data.jenis_cuti', 'Cuti Tahunan');

        $this->assertDatabaseHas('kpg_employee_leave_requests', [
            'employee_id' => $this->employee->id,
            'alasan_cuti' => 'Perpanjang SIM di Balikpapan',
        ]);
    }

    public function test_admin_can_view_inbox_leave_requests(): void
    {
        EmployeeLeaveRequest::create([
            'employee_id' => $this->employee->id,
            'nomor_pengajuan' => 'CUTI/2026/001',
            'tanggal_pengajuan' => '2026-06-04',
            'jenis_cuti' => 'Cuti Tahunan',
            'alasan_cuti' => 'Perpanjang SIM di Balikpapan',
            'jumlah_hari' => 1,
            'tanggal_mulai' => '2026-06-15',
            'tanggal_selesai' => '2026-06-15',
            'alamat_menjalankan_cuti' => 'Balikpapan',
            'telepon' => '081351458775',
            'sisa_n0' => 12,
        ]);

        $admin = User::factory()->create([
            'role' => 'super_admin',
            'username' => 'admin_cuti',
            'access_modules' => ['kepegawaian'],
        ]);

        $response = $this->actingAs($admin, 'sanctum')
            ->getJson('/api/kepegawaian/leave-requests');

        $response->assertStatus(200);
        $response->assertJsonCount(1, 'data');
    }

    public function test_status_toggle_and_restoration_updates_leave_balance(): void
    {
        $admin = User::factory()->create([
            'role' => 'admin',
            'username' => 'admin_kepegawaian',
            'access_modules' => ['kepegawaian'],
        ]);

        $leaveReq = EmployeeLeaveRequest::create([
            'employee_id' => $this->employee->id,
            'nomor_pengajuan' => 'CUTI/2026/002',
            'tanggal_pengajuan' => '2026-07-27',
            'jenis_cuti' => 'Cuti Tahunan',
            'alasan_cuti' => 'Urusan Keluarga',
            'jumlah_hari' => 2,
            'tanggal_mulai' => '2026-07-27',
            'tanggal_selesai' => '2026-07-28',
            'alamat_menjalankan_cuti' => 'Balikpapan',
            'telepon' => '081351458775',
            'status' => 'PENGAJUAN',
        ]);

        // 1. Change status to DISETUJUI -> deducts 2 days (used = 2)
        $resp1 = $this->actingAs($admin, 'sanctum')
            ->putJson("/api/kepegawaian/leave-requests/{$leaveReq->id}/status", [
                'status' => 'DISETUJUI',
            ]);
        $resp1->assertStatus(200);

        $this->assertDatabaseHas('kpg_employee_leaves', [
            'employee_id' => $this->employee->id,
            'year' => 2026,
            'cuti_terpakai_n0' => 2,
        ]);

        // 2. Change status back to PENGAJUAN -> restores 2 days (used = 0)
        $resp2 = $this->actingAs($admin, 'sanctum')
            ->putJson("/api/kepegawaian/leave-requests/{$leaveReq->id}/status", [
                'status' => 'PENGAJUAN',
            ]);
        $resp2->assertStatus(200);

        $this->assertDatabaseHas('kpg_employee_leaves', [
            'employee_id' => $this->employee->id,
            'year' => 2026,
            'cuti_terpakai_n0' => 0,
        ]);
    }

    public function test_admin_upload_scan_succeeds_even_when_drive_archive_fails(): void
    {
        \Illuminate\Support\Facades\Storage::fake('local');
        config([
            'filesystems.disks.drive.driver' => 'local',
            'filesystems.disks.drive.root' => '',
            'filesystems.disks.drive.throw' => true,
        ]);

        $admin = User::factory()->create([
            'role' => 'admin',
            'username' => 'admin_upload_cuti',
            'access_modules' => ['kepegawaian'],
        ]);

        $leaveReq = EmployeeLeaveRequest::create([
            'employee_id' => $this->employee->id,
            'nomor_pengajuan' => 'CUTI/2026/003',
            'tanggal_pengajuan' => '2026-11-16',
            'jenis_cuti' => 'Cuti Tahunan',
            'alasan_cuti' => 'Tes Upload Scan',
            'jumlah_hari' => 1,
            'tanggal_mulai' => '2026-11-18',
            'tanggal_selesai' => '2026-11-18',
            'alamat_menjalankan_cuti' => 'Samarinda',
            'telepon' => '081234567890',
            'status' => 'DISETUJUI',
        ]);

        $pdf = \Illuminate\Http\UploadedFile::fake()->create('surat-izin-tte.pdf', 120, 'application/pdf');

        $response = $this->actingAs($admin, 'sanctum')
            ->post('/api/kepegawaian/leave-requests/' . $leaveReq->id . '/upload-scan', [
                'file_scan_surat_izin' => $pdf,
            ], ['Accept' => 'application/json']);

        $response->assertOk()
            ->assertJsonPath('data.scan_surat_izin_nama', 'surat-izin-tte.pdf');

        $leaveReq->refresh();
        $this->assertNotEmpty($leaveReq->scan_surat_izin_path);
        $this->assertTrue(\Illuminate\Support\Facades\Storage::disk('local')->exists($leaveReq->scan_surat_izin_path));
    }

    public function test_admin_can_delete_uploaded_scan_slot_without_removing_other_slot(): void
    {
        $disk = \Illuminate\Support\Facades\Storage::fake('local');

        $admin = User::factory()->create([
            'role' => 'admin',
            'username' => 'admin_delete_scan',
            'access_modules' => ['kepegawaian'],
        ]);

        $regularUser = User::factory()->create([
            'role' => 'user',
            'username' => 'regular_no_delete_scan',
            'access_modules' => ['kepegawaian'],
        ]);

        $formulirPath = \Illuminate\Http\UploadedFile::fake()->create('formulir.pdf', 50, 'application/pdf')->store('cuti_scans/formulir', 'local');
        $izinPath = \Illuminate\Http\UploadedFile::fake()->create('surat-izin.pdf', 50, 'application/pdf')->store('cuti_scans/surat_izin', 'local');

        $leaveReq = EmployeeLeaveRequest::create([
            'employee_id' => $this->employee->id,
            'nomor_pengajuan' => 'CUTI/2026/004',
            'tanggal_pengajuan' => '2026-11-16',
            'jenis_cuti' => 'Cuti Tahunan',
            'alasan_cuti' => 'Tes Hapus Scan',
            'jumlah_hari' => 1,
            'tanggal_mulai' => '2026-11-18',
            'tanggal_selesai' => '2026-11-18',
            'alamat_menjalankan_cuti' => 'Samarinda',
            'telepon' => '081234567890',
            'status' => 'DISETUJUI',
            'scan_formulir_path' => $formulirPath,
            'scan_formulir_nama' => 'formulir.pdf',
            'scan_surat_izin_path' => $izinPath,
            'scan_surat_izin_nama' => 'surat-izin.pdf',
            'scan_surat_path' => $izinPath,
            'scan_surat_nama' => 'surat-izin.pdf',
            'scan_surat_uploaded_at' => now(),
            'scan_surat_uploaded_by' => $admin->id,
        ]);

        $this->actingAs($regularUser, 'sanctum')
            ->deleteJson('/api/kepegawaian/leave-requests/' . $leaveReq->id . '/scan?type=formulir')
            ->assertForbidden();

        // Deleting formulir keeps surat_izin intact
        $this->actingAs($admin, 'sanctum')
            ->deleteJson('/api/kepegawaian/leave-requests/' . $leaveReq->id . '/scan?type=formulir')
            ->assertOk()
            ->assertJsonPath('data.scan_formulir_nama', null)
            ->assertJsonPath('data.scan_surat_izin_nama', 'surat-izin.pdf');

        $this->assertFalse($disk->exists($formulirPath));
        $this->assertTrue($disk->exists($izinPath));

        $leaveReq->refresh();
        $this->assertNull($leaveReq->scan_formulir_path);
        $this->assertNotNull($leaveReq->scan_surat_uploaded_at);

        // Deleting already-removed slot yields 404
        $this->actingAs($admin, 'sanctum')
            ->deleteJson('/api/kepegawaian/leave-requests/' . $leaveReq->id . '/scan?type=formulir')
            ->assertNotFound();

        // Deleting remaining surat_izin clears legacy fields and upload timestamp
        $this->actingAs($admin, 'sanctum')
            ->deleteJson('/api/kepegawaian/leave-requests/' . $leaveReq->id . '/scan?type=surat_izin')
            ->assertOk()
            ->assertJsonPath('data.scan_surat_izin_nama', null)
            ->assertJsonPath('data.scan_surat_nama', null);

        $this->assertFalse($disk->exists($izinPath));
        $leaveReq->refresh();
        $this->assertNull($leaveReq->scan_surat_izin_path);
        $this->assertNull($leaveReq->scan_surat_path);
        $this->assertNull($leaveReq->scan_surat_uploaded_at);
        $this->assertNull($leaveReq->scan_surat_uploaded_by);
    }
}
