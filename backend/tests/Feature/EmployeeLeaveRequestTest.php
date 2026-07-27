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
}
