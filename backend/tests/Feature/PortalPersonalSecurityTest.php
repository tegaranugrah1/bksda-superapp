<?php

namespace Tests\Feature;

use App\Events\AdminInboxChanged;
use App\Events\PortalNotificationCreated;
use App\Jobs\ArchiveOfficialDocument;
use App\Models\DriveFile;
use App\Models\DriveFolder;
use App\Models\User;
use App\Modules\Bmn\Models\Asset;
use App\Modules\Bmn\Models\AssetLoan;
use App\Modules\Kepegawaian\Models\Employee;
use App\Modules\Kepegawaian\Models\EmployeeLeave;
use App\Modules\Kepegawaian\Models\EmployeeLeaveRequest;
use App\Modules\Kepegawaian\Models\LeaveType;
use App\Modules\Keuangan\Models\VisumSpdTemplate;
use App\Modules\SuratTugas\Models\AssignmentLetter;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Bus;
use Illuminate\Support\Facades\Event;
use Illuminate\Support\Facades\Mail;
use Illuminate\Support\Facades\Notification;
use Illuminate\Support\Facades\Storage;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

/** Real HTTP-kernel regression cases. Fixtures are dummy-only; no auth/permission middleware is disabled. */
class PortalPersonalSecurityTest extends TestCase
{
    use RefreshDatabase;

    private int $sequence = 1;

    protected function setUp(): void
    {
        parent::setUp();
        config(['filesystems.default' => 'local', 'auth.two_factor_enforce' => false]);
        Storage::fake('local');
        Mail::fake();
        Notification::fake();
        Event::fake([AdminInboxChanged::class, PortalNotificationCreated::class]);
        Bus::fake([ArchiveOfficialDocument::class]);
    }

    private function actor(string $name, string $role = 'user', array $modules = [], bool $pppk = false): array
    {
        $nip = '900000000000'.str_pad((string) $this->sequence++, 6, '0', STR_PAD_LEFT);
        $employee = Employee::create([
            'nip' => $nip,
            'nama_lengkap' => $name,
            'jabatan' => $pppk ? 'Dummy PPPK' : 'Dummy PNS',
            'pangkat_golongan' => 'Dummy Rank',
            'satuan_kerja' => 'Balai KSDA Kalimantan Timur',
            'is_active' => true,
        ]);
        $user = User::factory()->create([
            'name' => $name,
            'username' => $nip,
            'email' => $nip.'@example.test',
            'role' => $role,
            'access_modules' => $modules,
            'permissions' => null,
            'is_active' => true,
            'must_change_password' => false,
        ]);
        return [$user, $employee];
    }

    private function asset(Employee $owner, array $extra = []): Asset
    {
        $number = $this->sequence++;
        $path = 'audit-fixtures/bpkb-'.$number.'.pdf';
        Storage::disk('local')->put($path, "%PDF-1.4\nDUMMY PRIVATE DOCUMENT {$number}\n%%EOF");
        return Asset::create(array_merge([
            'kode_barang' => 'DUMMY-ASSET',
            'nup' => (string) $number,
            'nama_barang' => 'Dummy vehicle '.$number,
            'jenis_bmn' => 'Kendaraan',
            'employee_id' => $owner->id,
            'pengguna' => $owner->nama_lengkap,
            'nama_pengguna' => $owner->nama_lengkap,
            'bpkb_document_path' => $path,
            'bpkb_document_mime' => 'application/pdf',
        ], $extra));
    }

    private function letter(User $owner, Employee $employee): AssignmentLetter
    {
        $path = 'audit-fixtures/assignment-'.$this->sequence++.'.pdf';
        Storage::disk('local')->put($path, "%PDF-1.4\nDUMMY PRIVATE ASSIGNMENT\n%%EOF");
        $letter = AssignmentLetter::create([
            'maksud_tujuan' => 'Dummy confidential assignment',
            'tempat_tujuan' => 'Dummy destination',
            'tanggal_mulai' => '2026-11-02',
            'tanggal_selesai' => '2026-11-02',
            'status' => 'approved',
            'created_by' => $owner->id,
            'file_surat_path' => $path,
        ]);
        $letter->employees()->attach($employee->id, ['peran' => 'anggota']);
        return $letter;
    }

    private function leavePayload(string $type, string $start = '2026-11-02', ?string $end = null): array
    {
        return [
            'jenis_cuti' => $type,
            'alasan_cuti' => 'Dummy leave reason',
            'tanggal_mulai' => $start,
            'tanggal_selesai' => $end ?? $start,
            'alamat_menjalankan_cuti' => 'Dummy address',
            'telepon' => '080000000001',
        ];
    }

    private function annualBalance(Employee $employee): EmployeeLeave
    {
        return EmployeeLeave::create([
            'employee_id' => $employee->id,
            'year' => 2026,
            'hak_cuti_n' => 12,
            'sisa_cuti_n1' => 0,
            'cuti_terpakai_n1' => 0,
            'sisa_cuti_n2' => 0,
            'cuti_terpakai_n2' => 0,
            'cuti_terpakai_n0' => 0,
        ]);
    }

    public function test_portal_employee_cannot_use_own_filter_to_read_foreign_bpkb(): void
    {
        [$a, $employeeA] = $this->actor('Dummy Alpha');
        [, $employeeB] = $this->actor('Dummy Beta');
        $asset = $this->asset($employeeB);
        Sanctum::actingAs($a);
        $this->getJson("/api/bmn/assets/{$asset->id}/document/bpkb/view?employee_id={$employeeA->id}")
            ->assertStatus(403);
    }

    public function test_blank_legacy_name_does_not_authorize_foreign_bpkb(): void
    {
        [$a] = $this->actor('Dummy Alpha');
        [, $employeeB] = $this->actor('Different Owner');
        $asset = $this->asset($employeeB, ['nama_pengguna' => null]);
        Sanctum::actingAs($a);
        $this->getJson("/api/bmn/assets/{$asset->id}/document/bpkb/view")->assertStatus(403);
    }

    public function test_own_bpkb_remains_readable_to_portal_employee(): void
    {
        [$a, $employee] = $this->actor('Dummy Alpha');
        $asset = $this->asset($employee);
        Sanctum::actingAs($a);
        $this->getJson("/api/bmn/assets/{$asset->id}/document/bpkb/view")
            ->assertOk()->assertHeader('Content-Type', 'application/pdf');
    }

    public function test_personal_asset_list_does_not_match_another_owner_by_partial_name(): void
    {
        [$a, $employeeA] = $this->actor('Dummy Alpha');
        [, $employeeB] = $this->actor('Dummy Beta');
        $asset = $this->asset($employeeB, ['pengguna' => $employeeA->nama_lengkap.' Extended', 'nama_pengguna' => null]);
        Sanctum::actingAs($a);
        $response = $this->getJson('/api/me/assets')->assertOk();
        $this->assertNotContains($asset->id, array_column($response->json('data'), 'id'));
    }

    public function test_portal_employee_cannot_read_foreign_bpkb_even_if_pengguna_text_matches_their_name(): void
    {
        [$a, $employeeA] = $this->actor('Dummy Alpha');
        [, $employeeB] = $this->actor('Dummy Beta');
        $asset = $this->asset($employeeB, ['pengguna' => $employeeA->nama_lengkap, 'nama_pengguna' => null]);
        Sanctum::actingAs($a);
        $this->getJson("/api/bmn/assets/{$asset->id}/document/bpkb/view")
            ->assertStatus(403);
    }

    public function test_excel_pengguna_resolves_to_kepegawaian_employee_and_prevents_substring_hijack(): void
    {
        [$userAdi] = $this->actor('Adi');
        [, $empSuryadi] = $this->actor('Suryadi, S.Hut.');
        $asset = Asset::create([
            'kode_barang' => 'EXCEL-BMN',
            'nup' => '99',
            'nama_barang' => 'Laptop Dinas Excel',
            'jenis_bmn' => 'Peralatan',
            'pengguna' => 'Suryadi',
            'nama_pengguna' => 'Suryadi',
        ]);
        $this->assertSame($empSuryadi->id, (int) $asset->fresh()->employee_id);

        Sanctum::actingAs($userAdi);
        $response = $this->getJson('/api/me/assets')->assertOk();
        $this->assertNotContains($asset->id, array_column($response->json('data'), 'id'));
    }

    public function test_unrelated_module_admin_cannot_read_foreign_personal_assignment(): void
    {
        [$admin] = $this->actor('Dummy Inventory Admin', 'admin', ['inventory']);
        [$owner, $employee] = $this->actor('Dummy Letter Owner');
        $letter = $this->letter($owner, $employee);
        Sanctum::actingAs($admin);
        $this->getJson("/api/surat-tugas/my/{$letter->id}")->assertStatus(403);
    }

    public function test_unrelated_module_admin_cannot_download_foreign_personal_assignment(): void
    {
        [$admin] = $this->actor('Dummy Inventory Admin', 'admin', ['inventory']);
        [$owner, $employee] = $this->actor('Dummy Letter Owner');
        $letter = $this->letter($owner, $employee);
        Sanctum::actingAs($admin);
        $response = $this->getJson("/api/surat-tugas/my/{$letter->id}/download");
        // Both deny conventions preserve the object boundary; data must never be returned.
        $this->assertContains($response->status(), [403, 404]);
    }

    public function test_assigned_employee_can_read_and_download_own_assignment(): void
    {
        [$owner, $employee] = $this->actor('Dummy Letter Owner');
        $letter = $this->letter($owner, $employee);
        Sanctum::actingAs($owner);
        $this->getJson("/api/surat-tugas/my/{$letter->id}")->assertOk();
        $this->getJson("/api/surat-tugas/my/{$letter->id}/download")->assertOk()->assertJsonStructure(['data_url']);
    }

    public function test_non_creator_assigned_employee_cannot_read_unapproved_draft_assignment(): void
    {
        [$creator] = $this->actor('Dummy Draft Creator');
        [$assigneeUser, $assigneeEmployee] = $this->actor('Dummy Draft Assignee');
        $letter = $this->letter($creator, $assigneeEmployee);
        $letter->update(['status' => 'draft']);

        Sanctum::actingAs($assigneeUser);
        $this->getJson("/api/surat-tugas/my/{$letter->id}")->assertStatus(403);
        $this->getJson("/api/surat-tugas/my/{$letter->id}/download")->assertStatus(403);
    }

    public function test_non_admin_finance_member_cannot_change_global_visum_settings(): void
    {
        [$user] = $this->actor('Dummy Finance Member', 'user', ['keuangan']);
        Sanctum::actingAs($user);
        $regions = array_fill_keys(['samarinda', 'berau', 'tenggarong', 'balikpapan'], ['official_name' => 'DUMMY ALTERED OFFICIAL']);
        $this->postJson('/api/keuangan/visum/settings', $regions)->assertStatus(403);
    }

    public function test_non_admin_finance_member_cannot_create_global_visum_template(): void
    {
        [$user] = $this->actor('Dummy Finance Member', 'user', ['keuangan']);
        Sanctum::actingAs($user);
        $this->postJson('/api/keuangan/visum/templates', [
            'name' => 'Dummy unauthorized template', 'data' => ['place' => 'Dummy place'],
        ])->assertStatus(403);
    }

    public function test_finance_admin_can_create_global_visum_template(): void
    {
        [$user] = $this->actor('Dummy Finance Admin', 'admin', ['keuangan']);
        Sanctum::actingAs($user);
        $this->postJson('/api/keuangan/visum/templates', [
            'name' => 'Dummy authorized template', 'data' => ['place' => 'Dummy place'],
        ])->assertStatus(201);
    }

    public function test_portal_employee_can_still_read_visum_master_data(): void
    {
        [$user] = $this->actor('Dummy Portal Reader');
        Sanctum::actingAs($user);
        $this->getJson('/api/keuangan/visum/settings')->assertOk();
        $this->getJson('/api/keuangan/visum/templates')->assertOk();
    }

    public function test_annual_code_is_debited_after_real_admin_approval(): void
    {
        [$user, $employee] = $this->actor('Dummy Annual Applicant');
        $balance = $this->annualBalance($employee);
        Sanctum::actingAs($user);
        $request = $this->postJson('/api/me/leave-requests', $this->leavePayload('CT'))->assertStatus(201);
        [$admin] = $this->actor('Dummy Leave Admin', 'admin', ['kepegawaian']);
        Sanctum::actingAs($admin);
        $this->postJson('/api/kepegawaian/leave-requests/'.$request->json('data.id').'/approve')->assertOk();
        $this->assertSame(1, $balance->fresh()->cuti_terpakai_n0);
    }

    public function test_canonical_annual_name_is_debited_after_real_admin_approval(): void
    {
        [$user, $employee] = $this->actor('Dummy Annual Applicant');
        $balance = $this->annualBalance($employee);
        Sanctum::actingAs($user);
        $request = $this->postJson('/api/me/leave-requests', $this->leavePayload('Cuti Tahunan'))->assertStatus(201);
        [$admin] = $this->actor('Dummy Leave Admin', 'admin', ['kepegawaian']);
        Sanctum::actingAs($admin);
        $this->postJson('/api/kepegawaian/leave-requests/'.$request->json('data.id').'/approve')->assertOk();
        $this->assertSame(1, $balance->fresh()->cuti_terpakai_n0);
    }

    public function test_pending_annual_code_requests_reserve_the_same_quota_as_names(): void
    {
        [$user, $employee] = $this->actor('Dummy Annual Applicant');
        $this->annualBalance($employee);
        Sanctum::actingAs($user);
        $this->postJson('/api/me/leave-requests', $this->leavePayload('CT', '2026-11-02', '2026-11-11'))->assertStatus(201);
        $this->postJson('/api/me/leave-requests', $this->leavePayload('CT', '2026-11-16', '2026-11-25'))->assertStatus(422);
    }

    public function test_pppk_cannot_submit_restricted_leave_by_code(): void
    {
        [$user, $employee] = $this->actor('Dummy PPPK Applicant', 'user', [], true);
        $this->assertTrue($employee->is_pppk);
        Sanctum::actingAs($user);
        $this->postJson('/api/me/leave-requests', $this->leavePayload('CAP'))->assertStatus(422);
    }

    public function test_pppk_cannot_submit_restricted_leave_by_name(): void
    {
        [$user, $employee] = $this->actor('Dummy PPPK Applicant', 'user', [], true);
        $this->assertTrue($employee->is_pppk);
        Sanctum::actingAs($user);
        $this->postJson('/api/me/leave-requests', $this->leavePayload('Cuti Karena Alasan Penting'))->assertStatus(422);
    }

    public function test_portal_employee_can_list_only_their_own_assets(): void
    {
        [$user, $employee] = $this->actor('Dummy List Owner');
        [, $other] = $this->actor('Dummy Other Owner');
        $own = $this->asset($employee);
        $foreign = $this->asset($other);
        Sanctum::actingAs($user);
        $response = $this->getJson("/api/bmn/assets?employee_id={$employee->id}")->assertOk();
        $ids = array_column($response->json('data'), 'id');
        $this->assertContains($own->id, $ids);
        $this->assertNotContains($foreign->id, $ids);
    }

    public function test_get_body_cannot_override_the_authorized_employee_query_filter(): void
    {
        [$user, $employee] = $this->actor('Dummy List Owner');
        [, $other] = $this->actor('Dummy Other Owner');
        $own = $this->asset($employee);
        $foreign = $this->asset($other);
        Sanctum::actingAs($user);
        $response = $this->json('GET', "/api/bmn/assets?employee_id={$employee->id}", [
            'employee_id' => $other->id,
        ])->assertOk();
        $ids = array_column($response->json('data'), 'id');
        $this->assertContains($own->id, $ids);
        $this->assertNotContains($foreign->id, $ids);
    }

    public function test_portal_own_employee_filter_does_not_authorize_global_asset_export(): void
    {
        [$user, $employee] = $this->actor('Dummy Export Requester');
        Sanctum::actingAs($user);
        $this->getJson("/api/bmn/assets/export?employee_id={$employee->id}")->assertStatus(403);
    }

    public function test_authorized_assignment_admin_can_read_another_employees_letter(): void
    {
        [$admin] = $this->actor('Dummy Assignment Admin', 'admin', ['surat_tugas']);
        [$owner, $employee] = $this->actor('Dummy Letter Owner');
        $letter = $this->letter($owner, $employee);
        Sanctum::actingAs($admin);
        $this->getJson("/api/surat-tugas/my/{$letter->id}")->assertOk();
        $this->getJson("/api/surat-tugas/my/{$letter->id}/download")->assertOk();
    }

    public function test_non_admin_finance_member_cannot_mutate_existing_global_templates(): void
    {
        [$user] = $this->actor('Dummy Finance Member', 'user', ['keuangan']);
        $template = VisumSpdTemplate::create([
            'name' => 'Dummy existing master',
            'data' => ['place' => 'Dummy place'],
            'is_default' => false,
            'created_by' => $user->id,
        ]);
        Sanctum::actingAs($user);
        $this->putJson("/api/keuangan/visum/templates/{$template->id}", [
            'name' => 'Dummy altered master', 'data' => ['place' => 'Dummy altered place'],
        ])->assertStatus(403);
        $this->postJson("/api/keuangan/visum/templates/{$template->id}/duplicate")->assertStatus(403);
        $this->postJson("/api/keuangan/visum/templates/{$template->id}/set-default")->assertStatus(403);
        $this->deleteJson("/api/keuangan/visum/templates/{$template->id}")->assertStatus(403);
    }

    public function test_legacy_annual_code_status_approval_and_cancellation_update_quota(): void
    {
        [, $employee] = $this->actor('Dummy Legacy Applicant');
        $balance = $this->annualBalance($employee);
        $legacy = EmployeeLeaveRequest::create(array_merge($this->leavePayload('CT'), [
            'employee_id' => $employee->id,
            'tanggal_pengajuan' => '2026-10-31',
            'jumlah_hari' => 1,
            'status' => 'PENGAJUAN',
        ]));
        [$admin] = $this->actor('Dummy Leave Admin', 'admin', ['kepegawaian']);
        Sanctum::actingAs($admin);
        $this->putJson("/api/kepegawaian/leave-requests/{$legacy->id}/status", [
            'status' => 'DISETUJUI',
        ])->assertOk();
        $this->assertSame(1, $balance->fresh()->cuti_terpakai_n0);
        $this->putJson("/api/kepegawaian/leave-requests/{$legacy->id}/status", [
            'status' => 'PENGAJUAN',
        ])->assertOk();
        $this->assertSame(0, $balance->fresh()->cuti_terpakai_n0);
    }

    public function test_legacy_annual_code_reserves_pending_quota_and_balance(): void
    {
        [$user, $employee] = $this->actor('Dummy Legacy Applicant');
        $balance = $this->annualBalance($employee);
        EmployeeLeaveRequest::create(array_merge($this->leavePayload('CT', '2026-11-02', '2026-11-11'), [
            'employee_id' => $employee->id,
            'tanggal_pengajuan' => '2026-10-31',
            'jumlah_hari' => 8,
            'status' => 'PENGAJUAN',
        ]));
        $this->assertSame(8, $balance->fresh()->pending_cuti_tahunan);
        Sanctum::actingAs($user);
        $this->postJson('/api/me/leave-requests', $this->leavePayload('Cuti Tahunan', '2026-11-16', '2026-11-25'))
            ->assertStatus(422);
    }

    public function test_unknown_leave_type_is_rejected_before_persistence(): void
    {
        [$user, $employee] = $this->actor('Dummy Invalid Type Applicant');
        Sanctum::actingAs($user);
        $this->postJson('/api/me/leave-requests', $this->leavePayload('Dummy Unregistered Type'))
            ->assertStatus(422);
        $this->assertDatabaseMissing('kpg_employee_leave_requests', ['employee_id' => $employee->id]);
    }

    public function test_supported_master_rename_preserves_historical_annual_accounting(): void
    {
        [, $employee] = $this->actor('Dummy Historical Annual Applicant');
        $balance = $this->annualBalance($employee);
        $balance->update(['cuti_terpakai_n0' => 1]);
        $approved = EmployeeLeaveRequest::create(array_merge($this->leavePayload('Cuti Tahunan'), [
            'employee_id' => $employee->id, 'tanggal_pengajuan' => '2026-10-31',
            'jumlah_hari' => 1, 'status' => 'DISETUJUI',
        ]));
        $pending = EmployeeLeaveRequest::create(array_merge($this->leavePayload('CT', '2026-11-03'), [
            'employee_id' => $employee->id, 'tanggal_pengajuan' => '2026-10-31',
            'jumlah_hari' => 1, 'status' => 'PENGAJUAN',
        ]));
        $nonAnnual = EmployeeLeaveRequest::create(array_merge($this->leavePayload('Cuti Sakit', '2026-11-04'), [
            'employee_id' => $employee->id, 'tanggal_pengajuan' => '2026-10-31',
            'jumlah_hari' => 1, 'status' => 'PENGAJUAN',
        ]));
        $archived = EmployeeLeaveRequest::create(array_merge($this->leavePayload('CT', '2026-11-05'), [
            'employee_id' => $employee->id, 'tanggal_pengajuan' => '2026-10-31',
            'jumlah_hari' => 1, 'status' => 'DITOLAK',
        ]));
        $archived->delete();
        $type = LeaveType::where('kode', 'CT')->firstOrFail();
        [$admin] = $this->actor('Dummy Leave Type Admin', 'admin', ['kepegawaian']);
        Sanctum::actingAs($admin);
        $this->putJson("/api/kepegawaian/leave-types/{$type->id}", [
            'nama' => 'Dummy Renamed Annual', 'kode' => 'CT-DUMMY',
            'hitung_hari' => 'hari_kerja', 'potong_kuota_tahunan' => true,
            'maks_hari' => 12, 'is_active' => true,
        ])->assertOk();
        $this->assertSame('Dummy Renamed Annual', $approved->fresh()->jenis_cuti);
        $this->assertSame('Dummy Renamed Annual', $pending->fresh()->jenis_cuti);
        $this->assertSame('Dummy Renamed Annual', EmployeeLeaveRequest::withTrashed()->findOrFail($archived->id)->jenis_cuti);
        $this->assertTrue($approved->fresh()->isAnnual());
        $this->assertSame(1, $balance->fresh()->pending_cuti_tahunan);
        $this->assertSame(2, (int) EmployeeLeaveRequest::where('employee_id', $employee->id)->annual()->sum('jumlah_hari'));
        $this->assertSame('Cuti Sakit', $nonAnnual->fresh()->jenis_cuti);
        $this->putJson("/api/kepegawaian/leave-requests/{$approved->id}/status", [
            'status' => 'PENGAJUAN',
        ])->assertOk();
        $this->assertSame(0, $balance->fresh()->cuti_terpakai_n0);
    }

    public function test_non_super_admin_cannot_access_email_settings_or_trigger_test_email(): void
    {
        [$regularUser] = $this->actor('Dummy Portal Regular User', 'user');
        [$moduleAdmin] = $this->actor('Dummy Module Admin', 'admin', ['kepegawaian']);

        foreach ([$regularUser, $moduleAdmin] as $actor) {
            Sanctum::actingAs($actor);
            $this->getJson('/api/admin/email/settings')->assertStatus(403);
            $this->putJson('/api/admin/email/settings', ['settings' => ['email_master_enabled' => false]])->assertStatus(403);
            $this->postJson('/api/admin/email/test', ['recipient' => 'victim@example.com'])->assertStatus(403);
        }
    }

    public function test_active_borrower_cannot_access_private_bpkb_or_stnk_photo_slots(): void
    {
        [, $ownerEmp] = $this->actor('Dummy Vehicle Owner', 'user');
        [$borrowerUser, $borrowerEmp] = $this->actor('Dummy Vehicle Borrower', 'user');
        $asset = $this->asset($ownerEmp);

        AssetLoan::create([
            'asset_id' => $asset->id,
            'employee_id' => $borrowerEmp->id,
            'purpose' => 'Dummy patroli',
            'tanggal_pinjam' => '2026-11-01',
            'due_date' => '2026-11-10',
            'status' => 'dipinjam',
        ]);

        Sanctum::actingAs($borrowerUser);
        // Public photo slot passes middleware authorization (returns 404 when no file exists)
        $this->getJson("/api/bmn/assets/{$asset->id}/photo/depan/view")->assertStatus(404);
        // Private BPKB/STNK photo slots must be blocked by middleware for borrowers
        $this->getJson("/api/bmn/assets/{$asset->id}/photo/bpkb_1/view")->assertStatus(403);
        $this->getJson("/api/bmn/assets/{$asset->id}/photo/stnk_1/download")->assertStatus(403);
    }

    public function test_drive_star_restore_and_force_delete_block_unauthorized_users(): void
    {
        [$owner] = $this->actor('Dummy Drive Owner', 'user');
        [$attacker] = $this->actor('Dummy Drive Attacker', 'user');

        $folder = DriveFolder::create([
            'user_id' => $owner->id,
            'name' => 'Folder Pribadi Owner',
        ]);
        $file = DriveFile::create([
            'user_id' => $owner->id,
            'folder_id' => $folder->id,
            'name' => 'dokumen_pribadi.pdf',
            's3_key' => 'personal/' . $owner->id . '/dokumen_pribadi.pdf',
            'size_bytes' => 1024,
            'mime_type' => 'application/pdf',
        ]);

        Sanctum::actingAs($attacker);
        $this->putJson("/api/drive/file/{$file->id}/star")->assertStatus(403);
        $this->putJson("/api/drive/folder/{$folder->id}/star")->assertStatus(403);

        $file->delete();
        $folder->delete();

        $this->postJson("/api/drive/file/{$file->id}/restore")->assertStatus(403);
        $this->postJson("/api/drive/folder/{$folder->id}/restore")->assertStatus(403);
        $this->deleteJson("/api/drive/file/{$file->id}/force")->assertStatus(403);
        $this->deleteJson("/api/drive/folder/{$folder->id}/force")->assertStatus(403);

        $this->assertNotNull(DriveFile::withTrashed()->find($file->id));
        $this->assertNotNull(DriveFolder::withTrashed()->find($folder->id));
    }

    public function test_weekend_only_annual_leave_request_is_rejected_with_zero_working_days(): void
    {
        [$user] = $this->actor('Dummy Weekend Leave User', 'user');
        Sanctum::actingAs($user);

        // 2026-11-07 is Saturday, 2026-11-08 is Sunday (0 working days)
        $this->postJson('/api/me/leave-requests', $this->leavePayload('Cuti Tahunan', '2026-11-07', '2026-11-08'))
            ->assertStatus(422);
    }

    public function test_notify_employee_skips_inactive_user_and_drive_share_delete_handles_trashed_file(): void
    {
        [$inactiveUser, $inactiveEmployee] = $this->actor('Dummy Inactive Employee', 'user');
        $inactiveUser->update(['is_active' => false]);

        $notif = app(\App\Services\PortalNotificationService::class)->notifyEmployee(
            $inactiveEmployee,
            'Judul Uji',
            'Pesan Uji'
        );
        $this->assertNull($notif);

        [$owner] = $this->actor('Dummy Share Owner', 'user');
        [$attacker] = $this->actor('Dummy Share Attacker', 'user');

        $file = DriveFile::create([
            'user_id' => $owner->id,
            'name' => 'berkas_sampah.pdf',
            's3_key' => 'personal/' . $owner->id . '/berkas_sampah.pdf',
            'size_bytes' => 512,
            'mime_type' => 'application/pdf',
        ]);
        $share = \App\Models\DriveShare::create([
            'file_id' => $file->id,
            'share_type' => 'public',
            'role' => 'viewer',
            'token' => bin2hex(random_bytes(16)),
            'created_by' => $owner->id,
        ]);
        $file->delete(); // Soft-delete file to trash

        Sanctum::actingAs($attacker);
        $this->deleteJson("/api/drive/shares/{$share->id}")->assertStatus(403);
    }

    public function test_update_profile_clears_employee_email_when_passed_empty_string(): void
    {
        [$user, $employee] = $this->actor('Dummy Profile Email User', 'user');
        $employee->update(['email' => 'lama@bksda-kaltim.id', 'telepon' => '0811111111']);

        Sanctum::actingAs($user);
        $this->postJson('/api/me/update-profile', [
            'email' => '',
            'phone' => '0822222222',
        ])->assertOk();

        $employee->refresh();
        $this->assertNull($employee->email);
        $this->assertSame('0822222222', $employee->no_telepon);
        $this->assertSame('0822222222', $employee->telepon);
    }
}
