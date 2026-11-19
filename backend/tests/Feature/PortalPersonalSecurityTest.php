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

    public function test_ambiguous_legacy_asset_name_grants_neither_employee_document_access(): void
    {
        [$first, $firstEmployee] = $this->actor('Dummy Shared Name');
        [$second, $secondEmployee] = $this->actor('Dummy Shared Name');
        $asset = $this->asset($secondEmployee);
        Asset::whereKey($asset->id)->update(['employee_id' => null]);

        foreach ([$first, $second] as $user) {
            Sanctum::actingAs($user);
            $this->getJson("/api/bmn/assets/{$asset->id}/document/bpkb/view")->assertForbidden();
            $this->assertNotContains($asset->id, array_column($this->getJson('/api/me/assets')->assertOk()->json('data'), 'id'));
        }
        $this->assertNull($asset->fresh()->employee_id);
    }

    public function test_ambiguous_base_name_is_not_automatically_assigned_on_asset_import(): void
    {
        $this->actor('Dummy Shared Base');
        $this->actor('Dummy Shared Base, S.Hut.');
        $asset = Asset::create([
            'kode_barang' => 'DUMMY-AMBIGUOUS', 'nup' => '1001',
            'nama_barang' => 'Dummy ambiguous import', 'pengguna' => 'Dummy Shared Base',
        ]);
        $this->assertNull($asset->employee_id);
        $this->assertNull(Employee::resolveIdByName('Dummy Shared Base'));
    }

    public function test_asset_list_cannot_overwrite_an_owner_assigned_after_its_snapshot(): void
    {
        [$first, $employeeA] = $this->actor('Dummy Legacy Snapshot Owner');
        [$second, $employeeB] = $this->actor('Dummy Reassigned Owner');
        $asset = $this->asset($employeeA);
        Asset::whereKey($asset->id)->update(['employee_id' => null]);
        Sanctum::actingAs($first);
        $this->getJson("/api/bmn/assets/{$asset->id}/document/bpkb/view")->assertOk();
        $reassigned = false;
        Asset::retrieved(function (Asset $snapshot) use ($asset, $employeeB, &$reassigned) {
            if ($snapshot->id === $asset->id && ! $reassigned) {
                $reassigned = true;
                // Commit the valid administrator assignment between SELECT and the GET's map.
                Asset::whereKey($asset->id)->update(['employee_id' => $employeeB->id]);
            }
        });
        $this->getJson('/api/me/assets')->assertOk();
        $firstRead = $this->getJson("/api/bmn/assets/{$asset->id}/document/bpkb/view");
        Sanctum::actingAs($second);
        $secondRead = $this->getJson("/api/bmn/assets/{$asset->id}/document/bpkb/view");
        $this->assertTrue($reassigned);
        $firstRead->assertForbidden();
        $secondRead->assertOk();
        $this->assertSame($employeeB->id, (int) $asset->fresh()->employee_id);
    }

    public function test_visum_settings_read_cannot_overwrite_a_newer_administrator_value(): void
    {
        [$user] = $this->actor('Dummy Visum Snapshot Reader');
        $setting = \App\Modules\Keuangan\Models\VisumSpdSetting::updateOrCreate(
            ['key' => 'officials_and_ppk'],
            ['value' => ['samarinda' => ['official_name' => 'Dummy Old Official']]]
        );
        $replacement = array_fill_keys(['samarinda', 'berau', 'tenggarong', 'balikpapan'], ['official_name' => 'Dummy New Official']);
        $changed = false;
        \App\Modules\Keuangan\Models\VisumSpdSetting::retrieved(function ($snapshot) use ($setting, $replacement, &$changed) {
            if ($snapshot->id === $setting->id && ! $changed) {
                $changed = true;
                \Illuminate\Support\Facades\DB::table('visum_spd_settings')->where('id', $setting->id)
                    ->update(['value' => json_encode($replacement)]);
            }
        });
        Sanctum::actingAs($user);
        $this->getJson('/api/keuangan/visum/settings')->assertOk();
        $this->assertTrue($changed);
        $this->assertSame($replacement, $setting->fresh()->value);
    }

    public function test_unsaved_cpns_balance_cannot_grant_annual_leave_that_the_portal_denies(): void
    {
        [$user, $employee] = $this->actor('Dummy CPNS No Entitlement');
        $employee->update(['nip' => '199001012025061001']);
        $user->update(['username' => $employee->nip]);
        Sanctum::actingAs($user);
        $this->getJson('/api/me/leave-balance?year=2025')->assertOk()->assertJsonPath('data.hak_cuti_n', 0);
        $this->postJson('/api/me/leave-requests', $this->leavePayload('CT', '2025-11-03'))->assertUnprocessable();
        $this->assertDatabaseMissing('kpg_employee_leave_requests', ['employee_id' => $employee->id]);
    }

    public function test_unsaved_balance_reserves_only_the_quota_remaining_after_approved_history(): void
    {
        [$user, $employee] = $this->actor('Dummy Historical Quota Without Balance');
        EmployeeLeaveRequest::create(array_merge($this->leavePayload('CT', '2026-10-05', '2026-10-20'), [
            'employee_id' => $employee->id, 'tanggal_pengajuan' => '2026-10-01',
            'jumlah_hari' => 12, 'status' => 'DISETUJUI',
        ]));
        Sanctum::actingAs($user);
        $this->getJson('/api/me/leave-balance?year=2026')->assertOk()->assertJsonPath('data.sisa_cuti_tersedia', 0);
        $this->postJson('/api/me/leave-requests', $this->leavePayload('CT'))->assertUnprocessable();
    }

    public function test_annual_approval_routes_preserve_unsaved_zero_entitlement(): void
    {
        [, $employee] = $this->actor('Dummy CPNS Approval');
        $employee->update(['nip' => '199001012025061002']);
        [$admin] = $this->actor('Dummy Leave Balance Approver', 'admin', ['kepegawaian']);
        $leave = EmployeeLeaveRequest::create(array_merge($this->leavePayload('CT', '2025-11-03'), [
            'employee_id' => $employee->id, 'tanggal_pengajuan' => '2025-10-30',
            'jumlah_hari' => 1, 'status' => 'PENGAJUAN',
        ]));
        Sanctum::actingAs($admin);
        $this->putJson("/api/kepegawaian/leave-requests/{$leave->id}/status", ['status' => 'DISETUJUI'])->assertUnprocessable();
        $this->postJson("/api/kepegawaian/leave-requests/{$leave->id}/approve")->assertUnprocessable();
        $this->postJson("/api/kepegawaian/leave-requests/{$leave->id}/generate-surat-izin", ['nomor_surat' => 'DUMMY/ZERO/1'])->assertUnprocessable();
        $this->assertSame('PENGAJUAN', $leave->fresh()->status);
        $this->assertDatabaseMissing('kpg_employee_leaves', ['employee_id' => $employee->id, 'year' => 2025]);
    }

    public function test_moving_approved_history_without_balances_counts_each_year_once(): void
    {
        [, $employee] = $this->actor('Dummy Approved Leave Move');
        [$admin] = $this->actor('Dummy Approved Leave Editor', 'admin', ['kepegawaian']);
        $leave = EmployeeLeaveRequest::create(array_merge($this->leavePayload('CT'), [
            'employee_id' => $employee->id, 'tanggal_pengajuan' => '2026-10-30',
            'jumlah_hari' => 1, 'status' => 'DISETUJUI',
        ]));
        Sanctum::actingAs($admin);
        $this->putJson("/api/kepegawaian/leave-requests/{$leave->id}", $this->leavePayload('CT', '2027-11-01'))->assertOk();
        $this->assertDatabaseHas('kpg_employee_leaves', ['employee_id' => $employee->id, 'year' => 2026, 'cuti_terpakai_n0' => 0]);
        $this->assertDatabaseHas('kpg_employee_leaves', ['employee_id' => $employee->id, 'year' => 2027, 'cuti_terpakai_n0' => 1]);
    }

    public function test_unsaved_balance_uses_carryover_without_persisting_a_portal_read(): void
    {
        [$user, $employee] = $this->actor('Dummy Carryover Quota');
        $this->annualBalance($employee)->update(['year' => 2025]);
        Sanctum::actingAs($user);
        $this->getJson('/api/me/leave-balance?year=2026')->assertOk()->assertJsonPath('data.sisa_cuti_tersedia', 18);
        $this->postJson('/api/me/leave-requests', $this->leavePayload('CT', '2026-11-02', '2026-11-11'))->assertCreated();
        $this->postJson('/api/me/leave-requests', $this->leavePayload('CT', '2026-11-16', '2026-11-20'))->assertCreated();
        $this->assertDatabaseMissing('kpg_employee_leaves', ['employee_id' => $employee->id, 'year' => 2026]);
    }

    public function test_conflicting_legacy_owner_columns_cannot_authorize_either_employee(): void
    {
        [$first, $firstEmployee] = $this->actor('Dummy First Owner');
        [$second, $secondEmployee] = $this->actor('Dummy Second Owner');
        $asset = $this->asset($secondEmployee);
        Asset::whereKey($asset->id)->update([
            'employee_id' => null, 'pengguna' => $firstEmployee->nama_lengkap,
            'nama_pengguna' => $secondEmployee->nama_lengkap,
        ]);
        foreach ([$first, $second] as $user) {
            Sanctum::actingAs($user);
            $this->getJson("/api/bmn/assets/{$asset->id}/document/bpkb/view")->assertForbidden();
        }
    }

    public function test_explicit_employee_id_remains_authoritative_for_identical_names(): void
    {
        [$first] = $this->actor('Dummy Shared Name');
        [$second, $secondEmployee] = $this->actor('Dummy Shared Name');
        $asset = $this->asset($secondEmployee);
        Sanctum::actingAs($first);
        $this->getJson("/api/bmn/assets/{$asset->id}/document/bpkb/view")->assertForbidden();
        Sanctum::actingAs($second);
        $this->getJson("/api/bmn/assets/{$asset->id}/document/bpkb/view")->assertOk();
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
        [$superAdmin] = $this->actor('Dummy Leave Type Super Admin', 'super_admin', ['kepegawaian']);
        Sanctum::actingAs($admin);
        $this->putJson("/api/kepegawaian/leave-types/{$type->id}", [
            'nama' => 'Dummy Renamed Annual', 'kode' => 'CT-DUMMY',
            'hitung_hari' => 'hari_kerja', 'potong_kuota_tahunan' => true,
            'maks_hari' => 12, 'is_active' => true,
        ])->assertForbidden();
        Sanctum::actingAs($superAdmin);
        $this->putJson("/api/kepegawaian/leave-types/{$type->id}", [
            'nama' => 'Dummy Renamed Annual', 'kode' => 'CT-DUMMY',
            'hitung_hari' => 'hari_kerja', 'potong_kuota_tahunan' => true,
            'maks_hari' => 12, 'is_active' => true,
        ])->assertOk();
        Sanctum::actingAs($admin);
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

    public function test_portal_mobile_summary_requires_assignment_module_before_counting_global_approvals(): void
    {
        [$owner, $employee] = $this->actor('Dummy Pending Letter Owner');
        $this->letter($owner, $employee)->update(['status' => 'pending']);
        foreach ([
            ['admin', ['inventory'], null, 0],
            ['user', ['inventory'], ['surat_tugas.approve'], 0],
            ['user', [], null, 0],
            ['admin', ['surat_tugas'], null, 1],
            ['admin', ['kepegawaian'], null, 1],
            ['user', ['surat_tugas'], ['surat_tugas.approve'], 1],
            ['super_admin', [], null, 1],
        ] as [$role, $modules, $permissions, $expected]) {
            [$actor] = $this->actor('Dummy Approval Summary '.$this->sequence, $role, $modules);
            $actor->update(['permissions' => $permissions]);
            Sanctum::actingAs($actor);
            $this->getJson('/api/mobile/dashboard')->assertOk()
                ->assertJsonPath('data.summary.pending_approvals_count', $expected);
        }
    }

    public function test_portal_notification_filters_and_read_actions_cannot_target_another_user(): void
    {
        [$user] = $this->actor('Dummy Notification Recipient');
        [$other] = $this->actor('Dummy Other Recipient');
        $notices = [];
        foreach ([$user, $other] as $recipient) {
            $notices[] = \App\Models\PortalNotification::create([
                'user_id' => $recipient->id, 'title' => 'Dummy private notice',
                'message' => 'Dummy confidential message', 'type' => 'system',
            ]);
        }
        Sanctum::actingAs($user);
        $response = $this->getJson('/api/portal/notifications?user_id='.$other->id)->assertOk();
        $this->assertSame([$notices[0]->id], array_column($response->json('data'), 'id'));
        $this->postJson('/api/portal/notifications/'.$notices[1]->id.'/read')->assertNotFound();
        $this->postJson('/api/portal/notifications/mark-all-read', ['user_id' => $other->id])->assertOk();
        $this->assertNotNull($notices[0]->fresh()->read_at);
        $this->assertNull($notices[1]->fresh()->read_at);
    }

    public function test_portal_asset_owner_exception_does_not_allow_asset_or_document_mutations(): void
    {
        [$user, $employee] = $this->actor('Dummy Read Only Owner');
        $asset = $this->asset($employee);
        Sanctum::actingAs($user);
        $this->getJson("/api/bmn/assets/{$asset->id}/document/bpkb/view")->assertOk();
        $this->patchJson("/api/bmn/assets/{$asset->id}", ['nama_barang' => 'Dummy unauthorized change'])->assertForbidden();
        $this->postJson("/api/bmn/assets/{$asset->id}/photo")->assertForbidden();
        $this->deleteJson("/api/bmn/assets/{$asset->id}/document/bpkb")->assertForbidden();
        $this->assertSame($asset->nama_barang, $asset->fresh()->nama_barang);
        Storage::disk('local')->assertExists($asset->bpkb_document_path);
    }

    public function test_reading_portal_leave_balance_preserves_admin_recorded_usage_and_approval_deltas(): void
    {
        [$user, $employee] = $this->actor('Dummy Historical Leave User');
        [$admin] = $this->actor('Dummy Historical Leave Admin', 'admin', ['kepegawaian']);
        Sanctum::actingAs($admin);
        $this->postJson("/api/kepegawaian/employees/{$employee->id}/leaves", [
            'year' => 2026, 'hak_cuti_n' => 12, 'cuti_terpakai_n0' => 8,
        ])->assertOk();
        Sanctum::actingAs($user);
        $submitted = $this->postJson('/api/me/leave-requests', $this->leavePayload('CT'))->assertCreated();
        foreach ([
            '/api/me/leave-balance?year=2026',
            "/api/kepegawaian/employees/{$employee->id}/leaves?year=2026",
        ] as $url) {
            $this->getJson($url)->assertOk()->assertJsonPath('data.cuti_terpakai_n0', 8)
                ->assertJsonPath('data.sisa_cuti_dapat_diajukan', 3);
        }
        Sanctum::actingAs($admin);
        $this->putJson('/api/kepegawaian/leave-requests/'.$submitted->json('data.id').'/status', [
            'status' => 'DISETUJUI',
        ])->assertOk();
        Sanctum::actingAs($user);
        $this->getJson('/api/me/leave-balance?year=2026')->assertOk()
            ->assertJsonPath('data.cuti_terpakai_n0', 9)->assertJsonPath('data.sisa_cuti_tersedia', 3);
        $this->assertDatabaseHas('kpg_employee_leaves', [
            'employee_id' => $employee->id, 'year' => 2026, 'cuti_terpakai_n0' => 9,
        ]);
    }

    public function test_reading_leave_balance_cannot_replenish_quota_for_an_excess_portal_request(): void
    {
        [$user, $employee] = $this->actor('Dummy Limited Quota User');
        $this->annualBalance($employee)->update(['cuti_terpakai_n0' => 8]);
        Sanctum::actingAs($user);
        $this->postJson('/api/me/leave-requests', $this->leavePayload('CT'))->assertCreated();
        $this->getJson('/api/me/leave-balance?year=2026')->assertOk();
        $this->postJson('/api/me/leave-requests', $this->leavePayload('CT', '2026-11-16', '2026-11-25'))
            ->assertUnprocessable();
        $this->assertSame(1, EmployeeLeaveRequest::where('employee_id', $employee->id)->count());
    }

    public function test_unsaved_leave_balance_still_reports_approved_historical_requests_without_writing(): void
    {
        [$user, $employee] = $this->actor('Dummy Unsaved Leave User');
        EmployeeLeaveRequest::create(array_merge($this->leavePayload('CT', '2026-11-02', '2026-11-03'), [
            'employee_id' => $employee->id, 'tanggal_pengajuan' => '2026-10-31',
            'jumlah_hari' => 2, 'status' => 'DISETUJUI',
        ]));
        Sanctum::actingAs($user);
        $this->getJson('/api/me/leave-balance?year=2026')->assertOk()
            ->assertJsonPath('data.cuti_terpakai_n0', 2)->assertJsonPath('data.sisa_cuti_tersedia', 10);
        $this->assertDatabaseMissing('kpg_employee_leaves', ['employee_id' => $employee->id, 'year' => 2026]);
    }

    public function test_returning_an_asset_revokes_the_borrowers_photo_access_but_preserves_the_owner(): void
    {
        [$owner, $ownerEmployee] = $this->actor('Dummy Returned Asset Owner');
        [$borrower, $borrowerEmployee] = $this->actor('Dummy Returned Asset Borrower');
        $asset = $this->asset($ownerEmployee);
        $path = 'audit-fixtures/returned-loan-photo.png';
        Storage::disk('local')->put($path, base64_decode('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+j8E0AAAAASUVORK5CYII='));
        $asset->update(['foto_depan_path' => $path]);
        $loan = AssetLoan::create([
            'asset_id' => $asset->id, 'employee_id' => $borrowerEmployee->id,
            'tanggal_pinjam' => '2026-11-01', 'due_date' => '2026-11-10', 'status' => 'dipinjam',
        ]);
        Sanctum::actingAs($borrower);
        $this->getJson("/api/bmn/assets/{$asset->id}/photo/depan/view")->assertOk();
        $loan->update(['status' => 'dikembalikan', 'tanggal_kembali' => '2026-11-08']);
        $this->getJson("/api/bmn/assets/{$asset->id}/photo/depan/view")->assertForbidden();
        $this->getJson("/api/bmn/assets/{$asset->id}/photo/depan/download")->assertForbidden();
        Sanctum::actingAs($owner);
        $this->getJson("/api/bmn/assets/{$asset->id}/photo/depan/view")->assertOk();
    }

    public function test_me_endpoints_reject_non_scalar_profile_password_and_ignore_array_query_token(): void
    {
        [$user, $employee] = $this->actor('Dummy Scalar Boundary User');
        $asset = $this->asset($employee);
        $asset->update(['foto_depan_path' => 'audit-fixtures/portal-front.png']);
        AssetLoan::create([
            'asset_id' => $asset->id,
            'employee_id' => $employee->id,
            'tanggal_pinjam' => '2026-11-01',
            'due_date' => '2026-11-10',
            'status' => 'dipinjam',
        ]);
        Sanctum::actingAs($user);

        $dash = $this->getJson('/api/me/dashboard?token[]=bad')->assertOk();
        $assets = $this->getJson('/api/me/assets?token[]=bad')->assertOk();
        $this->assertStringNotContainsString('&token=', (string) $dash->json('data.my_assets.0.foto_depan_url'));
        $this->assertStringNotContainsString('&token=', (string) $assets->json('data.0.foto_depan_url'));

        $this->postJson('/api/me/update-profile', [
            'email' => 'renamed@example.com',
            'current_password' => ['not-a-string'],
        ])
            ->assertStatus(422)
            ->assertJsonValidationErrors(['current_password']);
    }

    public function test_mobile_dashboard_escapes_like_wildcards_for_unassigned_assets(): void
    {
        [$user] = $this->actor('Dummy%User_Wildcard');
        Asset::create([
            'kode_barang' => 'WILD-01',
            'nup' => '55',
            'nama_barang' => 'Kamera Dinas Lain',
            'jenis_bmn' => 'Peralatan',
            'pengguna' => 'DummyXUserYWildcard',
            'nama_pengguna' => 'DummyXUserYWildcard',
        ]);
        Sanctum::actingAs($user);

        $this->getJson('/api/mobile/dashboard')
            ->assertOk()
            ->assertJsonPath('data.summary.assigned_assets_count', 0);
    }
    public function test_inbox_broadcast_includes_module_admins_and_excludes_revoked_roles(): void
    {
        [$moduleAdmin] = $this->actor('Dummy Module Administrator', 'user', ['kepegawaian']);
        $moduleAdmin->update(['module_roles' => ['kepegawaian' => 'admin']]);
        $token = $moduleAdmin->createToken('dummy-module-admin')->accessToken;
        $channels = fn () => array_map(fn ($channel) => $channel->name, (new AdminInboxChanged('surat_tugas'))->broadcastOn());
        $this->assertContains('private-admin.inbox.surat_tugas.'.$token->id, $channels());
        $moduleAdmin->update(['module_roles' => ['kepegawaian' => 'user']]);
        $this->assertNotContains('private-admin.inbox.surat_tugas.'.$token->id, $channels());
    }


    public function test_portal_and_module_asset_photo_urls_do_not_include_the_bearer(): void
    {
        [$user, $employee] = $this->actor('Dummy Tokenless Photos', 'admin', ['bmn']);
        $path = 'audit-fixtures/tokenless-photo.png';
        Storage::disk('local')->put($path, base64_decode('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+j0R0AAAAASUVORK5CYII='));
        $asset = $this->asset($employee, ['foto_depan_path' => $path, 'foto_geotag_path' => $path]);
        $asset->update([
            'foto_url' => "/api/bmn/assets/{$asset->id}/photo/depan/view?token=old-dummy-token&v=9",
            'foto_geotag_url' => "/api/bmn/assets/{$asset->id}/photo/geotag/view?ToKeN=old-dummy-token&v=9",
        ]);
        AssetLoan::create([
            'asset_id' => $asset->id, 'employee_id' => $employee->id,
            'tanggal_pinjam' => '2026-11-01', 'due_date' => '2026-12-01', 'status' => 'dipinjam',
        ]);
        $token = $user->createToken('dummy-photo-regression')->plainTextToken;
        foreach ([['/api/me/assets', 'data.0'], ['/api/me/dashboard', 'data.my_assets.0'], ["/api/bmn/assets/{$asset->id}", 'data']] as [$endpoint, $root]) {
            $this->app['auth']->forgetGuards();
            $response = $this->getJson($endpoint, ['Authorization' => 'Bearer '.$token])->assertOk();
            foreach (['foto_depan_url', 'foto_geotag_url', 'foto_url'] as $key) {
                $url = $response->json($root.'.'.$key);
                $this->assertIsString($url);
                $this->assertStringContainsString('/photo/', $url);
                $this->assertStringNotContainsString('token=', $url);
                $this->assertStringNotContainsString($token, $url);
            }
        }
    }

    public function test_asset_photos_require_header_or_session_and_keep_the_ownership_boundary(): void
    {
        [$owner, $employee] = $this->actor('Dummy Photo Owner');
        [$other] = $this->actor('Dummy Other Photo Viewer');
        $path = 'audit-fixtures/header-photo.png';
        Storage::disk('local')->put($path, base64_decode('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+j0R0AAAAASUVORK5CYII='));
        $asset = $this->asset($employee, ['foto_depan_path' => $path]);
        $token = $owner->createToken('dummy-photo-owner')->plainTextToken;
        $otherToken = $other->createToken('dummy-photo-outsider')->plainTextToken;
        $url = "/api/bmn/assets/{$asset->id}/photo/depan/view";
        $this->app['auth']->forgetGuards();
        $this->getJson($url.'?token='.urlencode($token))->assertUnauthorized();
        $this->app['auth']->forgetGuards();
        $this->getJson(str_replace('/view', '/download', $url).'?token='.urlencode($token))->assertUnauthorized();
        $this->app['auth']->forgetGuards();
        $this->getJson($url, ['Authorization' => 'Bearer '.$token])->assertOk()
            ->assertHeader('Cache-Control', 'no-store, private')->assertHeader('Referrer-Policy', 'no-referrer');
        $this->app['auth']->forgetGuards();
        $this->getJson($url, ['Authorization' => 'Bearer '.$otherToken])->assertForbidden();
        $this->app['auth']->forgetGuards();
        $this->actingAs($owner, 'web')->getJson($url)->assertOk();
        $owner->tokens()->delete();
        $this->app['auth']->forgetGuards();
        $this->getJson($url, ['Authorization' => 'Bearer '.$token])->assertUnauthorized();
    }

    public function test_cached_asset_photo_snapshots_strip_legacy_credentials_without_reattaching_them(): void
    {
        $payload = ['items' => [[
            'photo' => '/api/bmn/assets/17/photo/depan/view?ToKeN=old-secret&v=9',
            'download' => '/api/bmn/assets/17/photo/depan/download/?token=old-secret&v=9',
        ]]];
        $result = \App\Modules\Bmn\Resources\AssetResource::stripQueryTokens($payload);
        $this->assertSame('/api/bmn/assets/17/photo/depan/view?v=9', $result['items'][0]['photo']);
        $this->assertSame('/api/bmn/assets/17/photo/depan/download/?v=9', $result['items'][0]['download']);
        $this->assertStringNotContainsString('dummy-current-token', json_encode($result));
    }

    public function test_bmn_documents_and_ktp_require_header_auth_without_query_credentials(): void
    {
        [$admin, $employee] = $this->actor('Dummy BMN Admin', 'admin', ['bmn']);
        [$other] = $this->actor('Dummy BMN Outsider');
        $png = base64_decode('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAusB9Wl6l5sAAAAASUVORK5CYII=');
        Storage::disk('local')->put('audit-fixtures/document-preview.jpg', $png);
        Storage::disk('local')->put('audit-fixtures/document-preview-page-2.jpg', $png);
        $asset = $this->asset($employee, ['bpkb_preview_path' => 'audit-fixtures/document-preview.jpg']);
        $agreement = \App\Modules\Bmn\Models\PowerOfAttorney::create([
            'employee_id' => $employee->id, 'generated_by' => $admin->id, 'number' => 'DUMMY/2026/001',
            'document_date' => '2026-11-19', 'first_party_snapshot' => [], 'second_party_snapshot' => [],
            'assets_snapshot' => [['document' => '/api/bmn/assets/17/document/bpkb/view?%74oken=old&v=9', 'ktp' => '/api/bmn/power-of-attorneys/17/ktp?token%5B%5D=old']],
            'asset_ids' => [$asset->id], 'ktp_path' => 'audit-fixtures/ktp.png',
        ]);
        Storage::disk('local')->put($agreement->ktp_path, $png);
        $token = $admin->createToken('dummy-document-header')->plainTextToken;
        $otherToken = $other->createToken('dummy-no-bmn')->plainTextToken;
        $headers = ['Authorization' => 'Bearer '.$token];
        $this->app['auth']->forgetGuards();
        $document = $this->getJson('/api/bmn/assets/'.$asset->id, $headers)->assertOk()->json('data.bpkb_document');
        $this->app['auth']->forgetGuards();
        $poa = $this->getJson('/api/bmn/power-of-attorneys/'.$agreement->id, $headers)->assertOk()->json('data');
        $this->assertSame('/api/bmn/power-of-attorneys/'.$agreement->id.'/ktp', $poa['ktp_url']);
        $this->assertStringNotContainsString('token', json_encode([$document, $poa['assets_snapshot'], $poa['ktp_url']]));
        $this->assertStringNotContainsString($token, json_encode([$document, $poa]));
        $urls = [$document['url'], $document['download_url'], ...$document['preview_urls'], $poa['ktp_url']];
        $this->assertCount(5, $urls);
        foreach ($urls as $url) {
            $this->app['auth']->forgetGuards();
            $this->getJson($url.(str_contains($url, '?') ? '&' : '?').'token='.urlencode($token))->assertUnauthorized();
            $this->app['auth']->forgetGuards();
            $this->getJson($url, $headers)->assertOk()->assertHeader('X-Content-Type-Options', 'nosniff')->assertHeader('Referrer-Policy', 'no-referrer');
            $this->app['auth']->forgetGuards();
            $this->getJson($url, ['Authorization' => 'Bearer '.$otherToken])->assertForbidden();
        }
        $admin->tokens()->delete();
        foreach ($urls as $url) {
            $this->app['auth']->forgetGuards();
            $this->getJson($url, $headers)->assertUnauthorized();
        }
    }

    public function test_cached_document_snapshots_remove_encoded_tokens_without_losing_version_or_fragment(): void
    {
        $url = '/api/bmn/assets/17/document/stnk/preview/2?%74oken=old&ToKeN%5Bx%5D=old&v=9&v=10#page=2';
        $this->assertSame('/api/bmn/assets/17/document/stnk/preview/2?v=9&v=10#page=2', \App\Modules\Bmn\Resources\AssetResource::stripQueryTokens($url));
        $this->assertSame('plain text', \App\Modules\Bmn\Resources\AssetResource::stripQueryTokens('plain text'));
    }

    public function test_bmn_photo_uploads_return_authenticated_urls_instead_of_public_storage_urls(): void
    {
        [$user, $employee] = $this->actor('Dummy Private Storage Admin', 'admin', ['bmn']);
        $asset = $this->asset($employee);
        Sanctum::actingAs($user);
        foreach (['depan', 'geotag'] as $type) {
            $endpoint = '/api/bmn/assets/'.$asset->id.($type === 'geotag' ? '/geotag' : '/photo');
            $upload = fn () => $this->postJson($endpoint, [
                'type' => $type, 'photo' => \Illuminate\Http\UploadedFile::fake()->image('dummy.png'),
            ])->assertOk()->assertJsonPath('data.url', '/api/bmn/assets/'.$asset->id.'/photo/'.$type.'/view');
            $old = $upload()->json('data.path');
            $new = $upload()->json('data.path');
            $this->assertNotSame($old, $new);
            Storage::disk('local')->assertMissing($old);
            Storage::disk('local')->assertExists($new);
            $this->assertSame($new, $asset->fresh()->getAttribute('foto_'.$type.'_path'));
            $this->getJson('/api/bmn/assets/'.$asset->id.'/photo/'.$type.'/view')->assertOk();
        }
    }

    public function test_failed_bmn_photo_writes_preserve_the_previous_file_and_database_reference(): void
    {
        [$user, $employee] = $this->actor('Dummy Failed Photo Admin', 'admin', ['bmn']);
        $old = 'audit-fixtures/previous-photo.png';
        $local = Storage::disk('local');
        $local->put($old, 'dummy previous photo');
        $asset = $this->asset($employee, ['foto_depan_path' => $old, 'foto_geotag_path' => $old]);
        Sanctum::actingAs($user);
        $disk = \Mockery::mock(\Illuminate\Filesystem\FilesystemAdapter::class);
        $disk->shouldReceive('putFileAs')->twice()->andReturnFalse();
        $disk->shouldNotReceive('delete');
        Storage::shouldReceive('disk')->andReturn($disk);
        foreach (['depan', 'geotag'] as $type) {
            $endpoint = '/api/bmn/assets/'.$asset->id.($type === 'geotag' ? '/geotag' : '/photo');
            $this->postJson($endpoint, ['type' => $type, 'photo' => \Illuminate\Http\UploadedFile::fake()->image('dummy.png')])->assertStatus(500);
            $this->assertSame($old, $asset->fresh()->getAttribute('foto_'.$type.'_path'));
            $this->assertTrue($local->exists($old));
        }
    }

    public function test_asset_detail_checks_geotag_storage_without_erasing_missing_references(): void
    {
        [$user, $employee] = $this->actor('Dummy Geotag Availability Admin', 'admin', ['bmn']);
        $path = 'audit-fixtures/geotag-availability.png';
        $asset = $this->asset($employee, ['foto_geotag_path' => $path]);
        Sanctum::actingAs($user);
        $this->getJson('/api/bmn/assets/'.$asset->id)->assertOk()->assertJsonPath('meta.geotag_available', false);
        $this->assertSame($path, $asset->fresh()->foto_geotag_path);
        Storage::disk('local')->put($path, base64_decode('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAusB9Wl6l5sAAAAASUVORK5CYII='));
        $this->getJson('/api/bmn/assets/'.$asset->id)->assertOk()->assertJsonPath('meta.geotag_available', true);
        Storage::disk('local')->delete($path);
        $this->getJson('/api/bmn/assets/'.$asset->id)->assertOk()->assertJsonPath('meta.geotag_available', false);
        $this->assertSame($path, $asset->fresh()->foto_geotag_path);
        $asset->update(['foto_geotag_url' => 'https://drive.google.com/file/d/dummy-fallback/view']);
        $this->getJson('/api/bmn/assets/'.$asset->id)->assertOk()->assertJsonPath('meta.geotag_available', null);
    }

    public function test_asset_detail_keeps_availability_unknown_when_storage_cannot_be_checked(): void
    {
        [$user, $employee] = $this->actor('Dummy Storage Unreachable Admin', 'admin', ['bmn']);
        $asset = $this->asset($employee, ['foto_geotag_path' => 'audit-fixtures/unreachable.png']);
        Sanctum::actingAs($user);
        $disk = \Mockery::mock(\Illuminate\Filesystem\FilesystemAdapter::class);
        $disk->shouldReceive('exists')->once()->andThrow(new \RuntimeException('Dummy storage unavailable'));
        Storage::shouldReceive('disk')->andReturn($disk);
        $this->getJson('/api/bmn/assets/'.$asset->id)->assertOk()->assertJsonPath('meta.geotag_available', null);
    }

    public function test_asset_list_checks_photo_inventory_once_for_a_hundred_assets(): void
    {
        [$user, $employee] = $this->actor('Dummy Batch Photo Admin', 'admin', ['bmn']);
        $present = null;
        for ($i = 0; $i < 100; $i++) {
            $asset = $this->asset($employee, [
                'foto_geotag_path' => 'bmn-photos/dummy-'.$i.'/geotag.jpg',
                'foto_geotag_url' => $i === 1 ? 'https://drive.google.com/file/d/dummy-external/view' : null,
            ]);
            if ($i === 0) $present = $asset->id;
        }
        Sanctum::actingAs($user);
        $disk = \Mockery::mock(\Illuminate\Filesystem\FilesystemAdapter::class);
        $disk->shouldReceive('allFiles')->once()->with('bmn-photos')->andReturn(['bmn-photos/dummy-0/geotag.jpg']);
        $disk->shouldNotReceive('exists');
        Storage::shouldReceive('disk')->andReturn($disk);
        $rows = $this->getJson('/api/bmn/assets?per_page=100')->assertOk()->assertJsonCount(100, 'data')->json('data');
        $this->assertTrue(collect($rows)->firstWhere('id', $present)['photo_availability']['geotag']);
        $this->assertCount(98, array_filter($rows, fn ($row) => ($row['photo_availability']['geotag'] ?? null) === false));
        $this->assertCount(1, array_filter($rows, fn ($row) => ! isset($row['photo_availability']['geotag'])));
    }

    public function test_asset_list_does_not_claim_files_missing_when_inventory_is_unreachable(): void
    {
        [$user, $employee] = $this->actor('Dummy Unknown Inventory Admin', 'admin', ['bmn']);
        $this->asset($employee, ['foto_geotag_path' => 'bmn-photos/dummy/geotag.jpg']);
        Sanctum::actingAs($user);
        $disk = \Mockery::mock(\Illuminate\Filesystem\FilesystemAdapter::class);
        $disk->shouldReceive('allFiles')->once()->andThrow(new \RuntimeException('Dummy inventory unavailable'));
        Storage::shouldReceive('disk')->andReturn($disk);
        $this->getJson('/api/bmn/assets')->assertOk()->assertJsonMissingPath('data.0.photo_availability');
    }

}
