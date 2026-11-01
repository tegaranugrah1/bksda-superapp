<?php

namespace Tests\Feature;

use App\Models\PortalNotification;
use App\Models\User;
use App\Modules\Kepegawaian\Models\Employee;
use App\Modules\SuratTugas\Models\AssignmentLetter;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Hash;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class SuratTugasApprovalAndPortalNotificationTest extends TestCase
{
    use RefreshDatabase;

    protected User $adminUser;
    protected User $regularUser;
    protected User $userA;
    protected User $userB;
    protected User $userC;

    protected Employee $employeeA;
    protected Employee $employeeB;
    protected Employee $employeeC;

    protected function setUp(): void
    {
        parent::setUp();

        // 1. Setup Admin Actor
        $this->adminUser = User::create([
            'name' => 'Admin Kepegawaian',
            'username' => 'admin_st',
            'email' => 'admin_st@bksda.local',
            'password' => Hash::make('Secret123!'),
            'role' => 'admin',
            'access_modules' => ['kepegawaian', 'surat_tugas'],
            'is_active' => true,
        ]);

        // 2. Setup Staf Tanpa Izin Approval
        $this->regularUser = User::create([
            'name' => 'Staf Biasa',
            'username' => 'staf_biasa',
            'email' => 'staf_biasa@bksda.local',
            'password' => Hash::make('Secret123!'),
            'role' => 'user',
            'access_modules' => [],
            'is_active' => true,
        ]);

        // 3. Setup Pegawai A, B, C dan Akun User terkait (username = NIP)
        $this->employeeA = Employee::create([
            'nip' => '199001012020011001',
            'nama_lengkap' => 'Budi Santoso',
            'satuan_kerja' => 'Balai BKSDA Samarinda',
            'is_active' => true,
        ]);
        $this->userA = User::create([
            'name' => $this->employeeA->nama_lengkap,
            'username' => $this->employeeA->nip,
            'email' => 'budi@bksda.local',
            'password' => Hash::make('Secret123!'),
            'role' => 'user',
            'is_active' => true,
        ]);

        $this->employeeB = Employee::create([
            'nip' => '199202022020021002',
            'nama_lengkap' => 'Siti Rahma',
            'satuan_kerja' => 'SKW I Berau',
            'is_active' => true,
        ]);
        $this->userB = User::create([
            'name' => $this->employeeB->nama_lengkap,
            'username' => $this->employeeB->nip,
            'email' => 'siti@bksda.local',
            'password' => Hash::make('Secret123!'),
            'role' => 'user',
            'is_active' => true,
        ]);

        $this->employeeC = Employee::create([
            'nip' => '199503032020031003',
            'nama_lengkap' => 'Andi Wijaya',
            'satuan_kerja' => 'SKW II Tenggarong',
            'is_active' => true,
        ]);
        $this->userC = User::create([
            'name' => $this->employeeC->nama_lengkap,
            'username' => $this->employeeC->nip,
            'email' => 'andi@bksda.local',
            'password' => Hash::make('Secret123!'),
            'role' => 'user',
            'is_active' => true,
        ]);
    }

    /**
     * ST-ROOT-01: Admin menyetujui Surat Tugas; notifikasi portal diterbitkan secara tertarget
     * hanya untuk personel yang ditugaskan (Pegawai A & B), bukan Pegawai C.
     */
    public function test_admin_approval_emits_portal_notification_for_assigned_employees(): void
    {
        Sanctum::actingAs($this->adminUser);

        // Buat surat tugas pending dengan personel A dan B
        $surat = AssignmentLetter::create([
            'nomor_surat' => 'ST.101/BKSDA/KPG/2026',
            'maksud_tujuan' => 'Patroli Pengamanan Kawasan Konservasi Berau',
            'tanggal_mulai' => '2026-11-20',
            'tanggal_selesai' => '2026-11-23',
            'sumber_dana' => 'dipa',
            'status' => 'pending',
            'created_by' => $this->adminUser->id,
        ]);

        $surat->employees()->attach([
            $this->employeeA->id => ['peran' => 'Ketua Tim'],
            $this->employeeB->id => ['peran' => 'Anggota'],
        ]);

        // Admin melakukan approval
        $response = $this->putJson("/api/surat-tugas/{$surat->id}/approve", [
            'status' => 'approved',
            'nomor_surat' => 'ST.101/BKSDA/KPG/2026',
            'maksud_tujuan' => 'Patroli Pengamanan Kawasan Konservasi Berau',
            'tanggal_mulai' => '2026-11-20',
            'tanggal_selesai' => '2026-11-23',
            'sumber_dana' => 'dipa',
        ]);

        $response->assertStatus(200);

        // Verifikasi status surat berubah menjadi approved
        $this->assertDatabaseHas('st_assignment_letters', [
            'id' => $surat->id,
            'status' => 'approved',
            'approved_by' => $this->adminUser->id,
        ]);

        // Verifikasi notifikasi terkirim ke User A dan User B
        $notifA = PortalNotification::where('user_id', $this->userA->id)->first();
        $this->assertNotNull($notifA, 'Pegawai A harus menerima notifikasi portal.');
        $this->assertEquals('Surat Tugas Diterbitkan', $notifA->title);
        $this->assertEquals('surat_tugas', $notifA->type);
        $this->assertEquals('surat_tugas', $notifA->action_tab);
        $this->assertEquals((string) $surat->id, $notifA->reference_id);
        $this->assertNull($notifA->read_at);

        $notifB = PortalNotification::where('user_id', $this->userB->id)->first();
        $this->assertNotNull($notifB, 'Pegawai B harus menerima notifikasi portal.');
        $this->assertEquals('Surat Tugas Diterbitkan', $notifB->title);

        // Verifikasi Pegawai C (tidak terlibat) TIDAK menerima notifikasi
        $notifC = PortalNotification::where('user_id', $this->userC->id)->count();
        $this->assertEquals(0, $notifC, 'Pegawai C yang tidak terlibat dilarang menerima notifikasi.');
    }

    /**
     * ST-ROOT-02: Staf biasa tanpa wewenang approval ditolak tegas HTTP 403 (Anti-Vertical Privilege Escalation).
     */
    public function test_regular_user_cannot_approve_surat_tugas(): void
    {
        Sanctum::actingAs($this->regularUser);

        $surat = AssignmentLetter::create([
            'nomor_surat' => 'ST.202/BKSDA/KPG/2026',
            'maksud_tujuan' => 'Survei Populasi Bekantan',
            'tanggal_mulai' => '2026-11-25',
            'tanggal_selesai' => '2026-11-27',
            'sumber_dana' => 'dipa',
            'status' => 'pending',
            'created_by' => $this->regularUser->id,
        ]);

        $response = $this->putJson("/api/surat-tugas/{$surat->id}/approve", [
            'status' => 'approved',
        ]);

        $response->assertStatus(403);
        $this->assertDatabaseHas('st_assignment_letters', [
            'id' => $surat->id,
            'status' => 'pending',
        ]);
        $this->assertEquals(0, PortalNotification::count());
    }

    /**
     * ST-ROOT-03: Pencegahan bentrok jadwal penugasan personel pada tanggal bertabrakan (CWE-362 Concurrency Guard).
     */
    public function test_approval_rejected_with_scheduling_conflict_on_overlapping_dates(): void
    {
        Sanctum::actingAs($this->adminUser);

        // Surat 1 sah dan sudah disetujui untuk Pegawai A: 10 Nov - 15 Nov
        $surat1 = AssignmentLetter::create([
            'nomor_surat' => 'ST.001/BKSDA/2026',
            'maksud_tujuan' => 'Tugas Awal',
            'tanggal_mulai' => '2026-11-10',
            'tanggal_selesai' => '2026-11-15',
            'sumber_dana' => 'dipa',
            'status' => 'approved',
            'created_by' => $this->adminUser->id,
        ]);
        $surat1->employees()->attach([$this->employeeA->id => ['peran' => 'Pelaksana']]);

        // Surat 2 pending untuk Pegawai A pada tanggal bertabrakan: 12 Nov - 14 Nov
        $surat2 = AssignmentLetter::create([
            'nomor_surat' => 'ST.002/BKSDA/2026',
            'maksud_tujuan' => 'Tugas Bertabrakan',
            'tanggal_mulai' => '2026-11-12',
            'tanggal_selesai' => '2026-11-14',
            'sumber_dana' => 'dipa',
            'status' => 'pending',
            'created_by' => $this->adminUser->id,
        ]);
        $surat2->employees()->attach([$this->employeeA->id => ['peran' => 'Pelaksana']]);

        // Coba approve Surat 2
        $response = $this->putJson("/api/surat-tugas/{$surat2->id}/approve", [
            'status' => 'approved',
            'nomor_surat' => 'ST.002/BKSDA/2026',
            'maksud_tujuan' => 'Tugas Bertabrakan',
            'tanggal_mulai' => '2026-11-12',
            'tanggal_selesai' => '2026-11-14',
            'sumber_dana' => 'dipa',
        ]);

        $response->assertStatus(422);
        $response->assertJsonFragment([
            'message' => 'Terdapat bentrok jadwal penugasan atau cuti aktif untuk beberapa personel yang dipilih.',
        ]);

        // Status Surat 2 tetap pending
        $this->assertDatabaseHas('st_assignment_letters', [
            'id' => $surat2->id,
            'status' => 'pending',
        ]);
    }

    /**
     * ST-ROOT-04: Penolakan nomor surat yang masih memuat placeholder mentah ({nomor}, ...)
     */
    public function test_validate_publication_rejects_placeholder_nomor_surat(): void
    {
        Sanctum::actingAs($this->adminUser);

        $surat = AssignmentLetter::create([
            'nomor_surat' => 'ST.{nomor}/BKSDA/2026',
            'maksud_tujuan' => 'Patroli Hutan',
            'tanggal_mulai' => '2026-12-01',
            'tanggal_selesai' => '2026-12-03',
            'sumber_dana' => 'dipa',
            'status' => 'pending',
            'created_by' => $this->adminUser->id,
        ]);
        $surat->employees()->attach([$this->employeeA->id => ['peran' => 'Pelaksana']]);

        $response = $this->putJson("/api/surat-tugas/{$surat->id}/approve", [
            'status' => 'approved',
            'nomor_surat' => 'ST.{nomor}/BKSDA/2026',
            'maksud_tujuan' => 'Patroli Hutan',
            'tanggal_mulai' => '2026-12-01',
            'tanggal_selesai' => '2026-12-03',
            'sumber_dana' => 'dipa',
        ]);

        $response->assertStatus(422);
        $this->assertDatabaseHas('st_assignment_letters', [
            'id' => $surat->id,
            'status' => 'pending',
        ]);
    }

    /**
     * ST-ROOT-05: Anti-Reversion State Machine: Surat approved dilarang didegradasi kembali ke draft.
     */
    public function test_anti_reversion_cannot_demote_approved_letter_to_draft(): void
    {
        Sanctum::actingAs($this->adminUser);

        $surat = AssignmentLetter::create([
            'nomor_surat' => 'ST.777/BKSDA/2026',
            'maksud_tujuan' => 'Tugas Resmi Terbit',
            'tanggal_mulai' => '2026-12-10',
            'tanggal_selesai' => '2026-12-12',
            'sumber_dana' => 'dipa',
            'status' => 'approved',
            'created_by' => $this->adminUser->id,
        ]);
        $surat->employees()->attach([$this->employeeA->id => ['peran' => 'Pelaksana']]);

        // Coba ubah kembali ke draft via update
        $response = $this->putJson("/api/surat-tugas/{$surat->id}", [
            'status' => 'draft',
            'maksud_tujuan' => 'Tugas Resmi Terbit',
            'tanggal_mulai' => '2026-12-10',
            'tanggal_selesai' => '2026-12-12',
            'sumber_dana' => 'dipa',
        ]);

        $response->assertStatus(422);
        $this->assertDatabaseHas('st_assignment_letters', [
            'id' => $surat->id,
            'status' => 'approved',
        ]);
    }

    /**
     * ST-ROOT-06: Anti-IDOR pada Endpoint Notifikasi Portal: Pegawai A tidak bisa membaca notifikasi Pegawai B.
     */
    public function test_portal_notification_anti_idor_and_mark_as_read(): void
    {
        // Buat notifikasi untuk Pegawai A dan Pegawai B
        $notifA = PortalNotification::create([
            'user_id' => $this->userA->id,
            'employee_id' => $this->employeeA->id,
            'title' => 'Surat Tugas A',
            'message' => 'Penugasan Anda telah terbit',
            'type' => 'surat_tugas',
            'read_at' => null,
        ]);

        $notifB = PortalNotification::create([
            'user_id' => $this->userB->id,
            'employee_id' => $this->employeeB->id,
            'title' => 'Surat Tugas B',
            'message' => 'Penugasan Anda telah terbit',
            'type' => 'surat_tugas',
            'read_at' => null,
        ]);

        // Pegawai B mencoba menandai dibaca notifikasi milik Pegawai A
        Sanctum::actingAs($this->userB);
        $attackResp = $this->postJson("/api/portal/notifications/{$notifA->id}/read");
        $attackResp->assertStatus(404);

        // Verifikasi notifikasi Pegawai A tetap unread
        $notifA->refresh();
        $this->assertNull($notifA->read_at);

        // Pegawai A membaca notifikasinya sendiri secara sah
        Sanctum::actingAs($this->userA);
        $validResp = $this->postJson("/api/portal/notifications/{$notifA->id}/read");
        $validResp->assertStatus(200);

        $notifA->refresh();
        $this->assertNotNull($notifA->read_at);
        $validResp->assertJsonFragment(['unread_count' => 0]);
    }

    /**
     * ST-ROOT-07: Tandai semua dibaca (mark-all-read) mengosongkan seluruh counter unread secara atomik.
     */
    public function test_portal_notification_mark_all_read(): void
    {
        Sanctum::actingAs($this->userA);

        for ($i = 1; $i <= 3; $i++) {
            PortalNotification::create([
                'user_id' => $this->userA->id,
                'employee_id' => $this->employeeA->id,
                'title' => "Notifikasi #{$i}",
                'message' => "Pesan notifikasi ke-{$i}",
                'type' => 'surat_tugas',
                'read_at' => null,
            ]);
        }

        // Cek unread awal = 3
        $listResp = $this->getJson('/api/portal/notifications');
        $listResp->assertStatus(200);
        $this->assertEquals(3, $listResp->json('meta.unread_count'));

        // Panggil mark-all-read
        $readAllResp = $this->postJson('/api/portal/notifications/mark-all-read');
        $readAllResp->assertStatus(200);

        // Cek unread akhir = 0
        $this->assertEquals(0, PortalNotification::where('user_id', $this->userA->id)->whereNull('read_at')->count());
    }
}
