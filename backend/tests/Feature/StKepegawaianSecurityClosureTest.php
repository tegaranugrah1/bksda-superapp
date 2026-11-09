<?php

namespace Tests\Feature;

use App\Events\AdminInboxChanged;
use App\Events\PortalNotificationCreated;
use App\Jobs\ArchiveOfficialDocument;
use App\Models\User;
use App\Modules\Kepegawaian\Models\Employee;
use App\Modules\Kepegawaian\Models\EmployeeLeave;
use App\Modules\Kepegawaian\Models\EmployeeLeaveRequest;
use App\Modules\Kepegawaian\Models\LeaveType;
use App\Modules\SuratTugas\Models\AssignmentLetter;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Bus;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Event;
use Illuminate\Support\Facades\Storage;
use Laravel\Sanctum\Sanctum;
use PHPUnit\Framework\Attributes\DataProvider;
use Tests\TestCase;

/** Real HTTP boundaries with dummy records and local storage; run in the audit sandbox. */
class StKepegawaianSecurityClosureTest extends TestCase
{
    use RefreshDatabase;

    private int $sequence = 0;

    protected function setUp(): void
    {
        parent::setUp();
        config(['auth.two_factor_enforce' => false, 'filesystems.default' => 'local']);
        Storage::fake('local');
        Event::fake([AdminInboxChanged::class, PortalNotificationCreated::class]);
        Bus::fake([ArchiveOfficialDocument::class]);
    }

    private function actor(string $role = 'user', array $modules = [], ?string $nip = null): array
    {
        $nip ??= '90000000000000'.str_pad((string) ++$this->sequence, 4, '0', STR_PAD_LEFT);
        $employee = Employee::create(['nip' => $nip, 'nama_lengkap' => 'Dummy Employee '.$this->sequence, 'is_active' => true]);
        $user = User::factory()->create([
            'username' => $nip, 'role' => $role, 'access_modules' => $modules, 'permissions' => null,
            'is_active' => true, 'must_change_password' => false,
        ]);
        return [$user, $employee];
    }

    private function letter(Employee $employee, array $changes = []): AssignmentLetter
    {
        $letter = AssignmentLetter::create(array_replace([
            'nomor_surat' => 'ST/DUMMY/001', 'maksud_tujuan' => 'Dummy assignment',
            'tanggal_mulai' => '2026-12-01', 'tanggal_selesai' => '2026-12-02',
            'sumber_dana' => 'dipa', 'status' => 'pending',
        ], $changes));
        $letter->employees()->attach($employee->id);
        return $letter;
    }

    public function test_guest_submission_does_not_disclose_selected_employee_private_fields(): void
    {
        [, $employee] = $this->actor();
        $private = ['nama_bank' => 'DUMMY_PRIVATE_BANK', 'nomor_rekening' => 'DUMMY_PRIVATE_ACCOUNT',
            'telepon' => 'DUMMY_PRIVATE_PHONE', 'email' => 'dummy-private-contact@example.test'];
        $employee->update($private);
        $selector = $this->getJson('/api/kepegawaian/employees/select')->assertOk();
        $response = $this->postJson('/api/surat-tugas/submit', [
            'maksud_tujuan' => 'Dummy public submission', 'tanggal_mulai' => '2026-12-01',
            'tanggal_selesai' => '2026-12-02', 'sumber_dana' => 'dipa', 'employees' => [['id' => $employee->id]],
        ])->assertCreated()->assertJsonPath('data.status', 'pending')->assertJsonPath('data.approved_by', null);
        foreach ([$selector, $response] as $result) {
            foreach ($private as $sentinel) {
                $this->assertStringNotContainsString($sentinel, $result->getContent());
            }
            $this->assertStringNotContainsString($employee->nip, $result->getContent());
        }
        $this->assertNotEmpty($response->json('data.id'));
        $this->assertSame(1, AssignmentLetter::where('status', 'pending')->count());
    }

    public function test_personal_employee_history_preserves_unpublished_letter_privacy(): void
    {
        [$participant, $employee] = $this->actor();
        [$creator, $foreignEmployee] = $this->actor();
        $pending = $this->letter($employee, ['created_by' => $creator->id, 'keterangan' => 'DUMMY_PENDING_PRIVATE']);
        $published = $this->letter($employee, ['status' => 'approved', 'created_by' => $creator->id]);
        Sanctum::actingAs($participant);
        $this->getJson('/api/surat-tugas/my/'.$pending->id)->assertForbidden();
        $history = $this->getJson('/api/kepegawaian/employees/'.$employee->id.'/assignment-letters')->assertOk();
        $this->assertStringNotContainsString('DUMMY_PENDING_PRIVATE', $history->getContent());
        $this->assertSame([$published->id], array_column($history->json('data'), 'id'));
        $this->getJson('/api/kepegawaian/employees/'.$foreignEmployee->id.'/assignment-letters')->assertForbidden();
        Sanctum::actingAs($creator);
        $this->getJson('/api/surat-tugas/my/'.$pending->id)->assertOk();
        [$admin] = $this->actor('admin', ['kepegawaian']);
        Sanctum::actingAs($admin);
        $this->getJson('/api/kepegawaian/employees/'.$employee->id.'/assignment-letters')
            ->assertOk()->assertJsonCount(2, 'data');
    }

    public static function sharedPhotoCases(): array
    {
        return ['force-active' => [false, false], 'force-trashed' => [false, true],
            'replace-hidden-active' => [true, false], 'replace-hidden-trashed' => [true, true]];
    }

    public function test_completed_trip_remains_excluded_from_meal_allowance(): void
    {
        [$admin, $employee] = $this->actor('admin', ['surat_tugas', 'kepegawaian']);
        Sanctum::actingAs($admin);
        $letter = $this->postJson('/api/surat-tugas', [
            'nomor_surat' => 'ST/DUMMY/MEAL', 'maksud_tujuan' => 'Dummy meal trip', 'status' => 'approved',
            'tanggal_mulai' => '2026-09-02', 'tanggal_selesai' => '2026-09-02',
            'sumber_dana' => 'dipa', 'employees' => [['id' => $employee->id]],
        ])->assertCreated()->json('data.id');
        $html = '<html><body><table><tr><td>NAMA</td><td>Dummy</td></tr><tr><td>NIP</td><td>'.$employee->nip.'</td></tr>'
            .'<tr><td>BULAN</td><td>September 2026</td></tr></table><table class="wbo"><tbody>'
            .'<tr><td>1</td><td>02/09/2026</td><td>Wfo</td><td>07:30</td><td>16:00</td><td></td><td></td><td></td><td></td><td></td><td>Hadir</td></tr>'
            .'</tbody></table></body></html>';
        $reconcile = fn () => $this->postJson('/api/kepegawaian/uang-makan/reconcile', [
            'files' => [UploadedFile::fake()->createWithContent('dummy-presensi.xls', $html)],
        ])->assertOk();
        $reconcile()->assertJsonPath('data.items.0.daily_matrix.2.status', 'PD')->assertJsonPath('data.items.0.jml_hadir', 0);
        $this->putJson('/api/surat-tugas/'.$letter.'/status', ['status' => 'completed'])->assertOk();
        $reconcile()->assertJsonPath('data.items.0.daily_matrix.2.status', 'PD')
            ->assertJsonPath('data.items.0.jml_hadir', 0)->assertJsonPath('data.items.0.uang_makan_bruto', 0);
    }

    public function test_approver_cannot_revise_already_official_content_through_sibling_actions(): void
    {
        [$approver, $employee] = $this->actor('user', ['surat_tugas']);
        $approver->update(['permissions' => ['surat_tugas.approve']]);
        Sanctum::actingAs($approver);
        $letter = $this->letter($employee, ['status' => 'approved']);
        foreach ([['maksud_tujuan' => 'Dummy unauthorized revision', 'status' => 'approved'],
            ['maksud_tujuan' => 'Dummy unauthorized revision']] as $changes) {
            $this->putJson('/api/surat-tugas/'.$letter->id.'/approve', $changes)->assertForbidden();
            $this->assertSame('Dummy assignment', $letter->fresh()->maksud_tujuan);
        }
        $this->putJson('/api/surat-tugas/'.$letter->id.'/status', ['status' => 'approved', 'nomor_surat' => 'ST/DUMMY/CHANGED'])->assertForbidden();
        $this->assertSame('ST/DUMMY/001', $letter->fresh()->nomor_surat);
        // Explicit approval permission still permits the initial pending publication.
        $letter->update(['status' => 'pending']);
        $this->putJson('/api/surat-tugas/'.$letter->id.'/approve', ['status' => 'approved'])->assertOk();
        [$admin] = $this->actor('admin', ['surat_tugas']);
        Sanctum::actingAs($admin);
        $this->putJson('/api/surat-tugas/'.$letter->id.'/status', ['status' => 'approved', 'nomor_surat' => 'ST/DUMMY/CORRECTED'])->assertOk();
        $this->assertSame('ST/DUMMY/CORRECTED', $letter->fresh()->nomor_surat);
    }

    public function test_update_rechecks_participant_authority_after_loading_locked_record(): void
    {
        [$participant, $employee] = $this->actor('user', ['surat_tugas']);
        [$creator, $other] = $this->actor();
        $letter = $this->letter($employee, ['created_by' => $creator->id]);
        Sanctum::actingAs($participant);
        $originalDispatcher = AssignmentLetter::getEventDispatcher();
        AssignmentLetter::setEventDispatcher(clone $originalDispatcher);
        $interleaved = false;
        try {
            // Hydrate the old participant snapshot, then persist the new roster before locking.
            AssignmentLetter::retrieved(function ($snapshot) use ($letter, $other, &$interleaved) {
                if ($snapshot->id !== $letter->id || $interleaved) return;
                $interleaved = true;
                $snapshot->setRelation('employees', $snapshot->employees()->get());
                $snapshot->employees()->sync([$other->id]);
            });
            $this->putJson('/api/surat-tugas/'.$letter->id, [
                'maksud_tujuan' => 'Dummy stale participant overwrite', 'tanggal_mulai' => '2026-12-01',
                'tanggal_selesai' => '2026-12-02', 'sumber_dana' => 'dipa', 'employees' => [['id' => $employee->id]],
            ])->assertForbidden();
        } finally {
            AssignmentLetter::setEventDispatcher($originalDispatcher);
        }
        $this->assertTrue($interleaved);
        $this->assertSame('Dummy assignment', $letter->fresh()->maksud_tujuan);
        $this->assertSame([$other->id], $letter->employees()->pluck('kpg_employees.id')->all());
    }

    public function test_single_and_bulk_restore_recheck_current_schedule_and_roll_back(): void
    {
        [$creator, $employee] = $this->actor('user', ['surat_tugas']);
        Sanctum::actingAs($creator);
        foreach (['single', 'bulk'] as $mode) {
            $old = $this->letter($employee, ['created_by' => $creator->id]);
            $old->delete();
            $payload = ['maksud_tujuan' => 'Dummy new active assignment', 'tanggal_mulai' => '2026-12-01',
                'tanggal_selesai' => '2026-12-02', 'sumber_dana' => 'dipa', 'employees' => [['id' => $employee->id]]];
            $active = $this->postJson('/api/surat-tugas', $payload)->assertCreated()->json('data.id');
            $path = $mode === 'single' ? '/api/surat-tugas/'.$old->id.'/restore' : '/api/surat-tugas/bulk-restore';
            $this->postJson($path, $mode === 'single' ? [] : ['ids' => [$old->id]])->assertUnprocessable();
            $this->assertNotNull($old->fresh()->deleted_at);
            AssignmentLetter::findOrFail($active)->delete();
            $this->postJson($path, $mode === 'single' ? [] : ['ids' => [$old->id]])->assertOk();
            $this->assertNull($old->fresh()->deleted_at);
            $old->delete();
        }
    }

    public function test_pending_status_transition_cannot_reactivate_conflicting_reservation(): void
    {
        [$approver, $employee] = $this->actor('user', ['surat_tugas']);
        $approver->update(['permissions' => ['surat_tugas.approve']]);
        Sanctum::actingAs($approver);
        $old = $this->letter($employee, ['status' => 'rejected']);
        $conflict = $this->letter($employee, ['status' => 'pending']);
        $result = $this->putJson('/api/surat-tugas/'.$old->id.'/status', ['status' => 'pending']);
        $this->assertSame('rejected', $old->fresh()->status);
        $result->assertUnprocessable();
        $conflict->delete();
        $this->putJson('/api/surat-tugas/'.$old->id.'/status', ['status' => 'pending'])->assertOk();
        $this->assertSame('pending', $old->fresh()->status);
        $this->assertNull($old->fresh()->approved_by);
    }

    public function test_effective_personnel_dates_cannot_invert_or_hide_an_existing_trip(): void
    {
        [, $employee] = $this->actor();
        $this->letter($employee, ['tanggal_mulai' => '2026-12-10', 'tanggal_selesai' => '2026-12-20']);
        $payload = ['maksud_tujuan' => 'Dummy per-person schedule', 'tanggal_mulai' => '2026-12-01',
            'tanggal_selesai' => '2026-12-31', 'sumber_dana' => 'dipa',
            'employees' => [['id' => $employee->id, 'tanggal_mulai' => '2026-12-21', 'tanggal_selesai' => '2026-12-09']]];
        $this->postJson('/api/surat-tugas/submit', $payload)->assertUnprocessable();
        $this->assertSame(1, AssignmentLetter::count());
        // One omitted bound still uses the corresponding document bound, then validates the effective interval.
        $payload['employees'][0] = ['id' => $employee->id, 'tanggal_mulai' => '2027-01-01'];
        $this->postJson('/api/surat-tugas/submit', $payload)->assertUnprocessable();
        $this->assertSame(1, AssignmentLetter::count());
        $payload['employees'][0] = ['id' => $employee->id, 'tanggal_mulai' => '2026-12-01', 'tanggal_selesai' => '2026-12-02'];
        $this->postJson('/api/surat-tugas/submit', $payload)->assertCreated();
    }

    public function test_employee_bank_batch_cannot_change_protected_profiles_or_partially_apply(): void
    {
        [$admin, $ordinary] = $this->actor('admin', ['kepegawaian']);
        [$super, $protected] = $this->actor('super_admin');
        $ordinary->update(['nomor_rekening' => 'DUMMY_ORIGINAL_ORDINARY']);
        $protected->update(['nomor_rekening' => 'DUMMY_ORIGINAL_PROTECTED']);
        Sanctum::actingAs($admin);
        $this->putJson('/api/kepegawaian/employees/'.$protected->id, [
            'nip' => $protected->nip, 'nama_lengkap' => $protected->nama_lengkap, 'nomor_rekening' => 'DUMMY_CHANGED',
        ])->assertForbidden();
        $payload = ['employee_ids' => [$ordinary->id, $protected->id], 'single_update' => true, 'nomor_rekening' => 'DUMMY_CHANGED'];
        $this->putJson('/api/kepegawaian/settings/employee-banks/batch', $payload)->assertForbidden();
        $this->assertSame('DUMMY_ORIGINAL_ORDINARY', $ordinary->fresh()->nomor_rekening);
        $this->assertSame('DUMMY_ORIGINAL_PROTECTED', $protected->fresh()->nomor_rekening);
        $payload['employee_ids'] = [$ordinary->id];
        $this->putJson('/api/kepegawaian/settings/employee-banks/batch', $payload)->assertOk();
        Sanctum::actingAs($super);
        $payload['employee_ids'] = [$protected->id];
        $this->putJson('/api/kepegawaian/settings/employee-banks/batch', $payload)->assertOk();
        $this->assertSame('DUMMY_CHANGED', $protected->fresh()->nomor_rekening);
    }

    private function annualType(): LeaveType
    {
        return LeaveType::updateOrCreate(['kode' => 'CT'], ['nama' => 'Cuti Tahunan', 'hitung_hari' => 'hari_kerja',
            'potong_kuota_tahunan' => true, 'is_active' => true]);
    }

    public function test_agent_leave_uses_canonical_type_and_working_day_policy(): void
    {
        [, $employee] = $this->actor();
        $this->annualType();
        EmployeeLeave::create(['employee_id' => $employee->id, 'year' => 2026, 'hak_cuti_n' => 12]);
        $payload = ['nip' => $employee->nip, 'jenis_cuti' => 'Dummy Unknown Annual', 'alasan_cuti' => 'Dummy leave',
            'tanggal_mulai' => '2026-11-06', 'tanggal_selesai' => '2026-11-09'];
        $this->postJson('/api/agent/v1/leaves/request', $payload)->assertUnprocessable();
        $payload['jenis_cuti'] = 'CT';
        $result = $this->postJson('/api/agent/v1/leaves/request', $payload)->assertCreated();
        $id = $result->json('data.id');
        $this->assertDatabaseHas('kpg_employee_leave_requests', ['id' => $id, 'jenis_cuti' => 'Cuti Tahunan', 'jumlah_hari' => 2]);
        $this->getJson('/api/agent/v1/employees/'.$employee->nip.'/leaves')
            ->assertOk()->assertJsonPath('data.pending_pengajuan', 2)->assertJsonPath('data.sisa_dapat_diajukan', 10);
    }

    public function test_agent_does_not_invent_unsaved_cpns_entitlement(): void
    {
        [$user, $employee] = $this->actor('user', [], '199001012025061001');
        $this->annualType();
        Sanctum::actingAs($user);
        $this->getJson('/api/me/leave-balance?year=2025')->assertOk()->assertJsonPath('data.hak_cuti_n', 0);
        $this->postJson('/api/agent/v1/leaves/request', ['nip' => $employee->nip, 'jenis_cuti' => 'CT',
            'alasan_cuti' => 'Dummy no entitlement', 'tanggal_mulai' => '2025-11-03', 'tanggal_selesai' => '2025-11-03'])->assertUnprocessable();
        $this->travelTo(\Carbon\Carbon::parse('2025-11-01'));
        $this->getJson('/api/agent/v1/employees/'.$employee->nip.'/leaves')
            ->assertOk()->assertJsonPath('data.hak_cuti_n', 0)->assertJsonPath('data.sisa_dapat_diajukan', 0);
        $this->travelBack();
        $this->assertDatabaseMissing('kpg_employee_leave_requests', ['employee_id' => $employee->id]);
    }

    public function test_agent_network_gate_ignores_untrusted_forwarded_loopback(): void
    {
        $previousEnvironment = $this->app['env'];
        $this->app['env'] = 'local';
        config(['services.agent.allowed_ips' => ['127.0.0.1'], 'services.agent.internal_key' => 'DummyPrivateAgentKey']);
        $payload = ['maksud_tujuan' => 'Dummy integration gate', 'tempat_tujuan' => 'Dummy location',
            'tanggal_mulai' => '2026-12-01', 'tanggal_selesai' => '2026-12-01'];
        try {
            $this->withServerVariables(['REMOTE_ADDR' => '203.0.113.10'])
                ->postJson('/api/agent/v1/surat-tugas/draft', $payload)->assertForbidden();
            $this->withHeader('X-Forwarded-For', '127.0.0.1')
                ->postJson('/api/agent/v1/surat-tugas/draft', $payload)->assertForbidden();
            $this->withHeader('X-Agent-Internal-Key', 'DummyPrivateAgentKey')
                ->postJson('/api/agent/v1/surat-tugas/draft', $payload)->assertCreated();
        } finally {
            $this->app['env'] = $previousEnvironment;
        }
    }

    public function test_agent_has_no_committed_default_service_credential(): void
    {
        $previousEnvironment = $this->app['env'];
        $this->app['env'] = 'local';
        config(['services.agent' => ['allowed_ips' => []]]);
        try {
            $this->withServerVariables(['REMOTE_ADDR' => '203.0.113.10'])
                ->withHeader('X-Agent-Internal-Key', 'bksda-hermes-agent-secure-token-2026')
                ->postJson('/api/agent/v1/surat-tugas/draft', ['maksud_tujuan' => 'Dummy default credential check',
                    'tempat_tujuan' => 'Dummy location', 'tanggal_mulai' => '2026-12-01', 'tanggal_selesai' => '2026-12-01'])
                ->assertForbidden();
            $this->assertSame(0, AssignmentLetter::count());
        } finally {
            $this->app['env'] = $previousEnvironment;
        }
    }

    public function test_agent_nip_alone_cannot_replace_a_registered_phone(): void
    {
        [, $employee] = $this->actor();
        $employee->update(['telepon' => '+6281200000001']);
        $this->postJson('/api/agent/v1/auth/link-phone', ['nip' => $employee->nip, 'phone' => '+6281300000002'])->assertNotFound();
        $this->assertSame('+6281200000001', $employee->fresh()->telepon);
        $this->postJson('/api/agent/v1/auth/link-phone', ['nip' => $employee->nip, 'phone' => '0812-0000-0001'])->assertOk();
        $this->assertSame('+6281200000001', $employee->fresh()->telepon);
    }

    public static function phoneIdentityCases(): array
    {
        return ['suffix' => ['suffix'], 'history' => ['history'], 'ambiguous' => ['ambiguous']];
    }

    #[DataProvider('phoneIdentityCases')]
    public function test_agent_phone_identity_rejects_suffix_collisions_old_contacts_and_ambiguity(string $case): void
    {
        [, $employee] = $this->actor();
        $employee->update(['telepon' => '+62811999999901']);
        $phone = '+62812999999901';
        if ($case === 'history') {
            EmployeeLeaveRequest::create(['employee_id' => $employee->id, 'jenis_cuti' => 'Cuti Tahunan',
                'alasan_cuti' => 'Dummy old contact', 'alamat_menjalankan_cuti' => 'Dummy address',
                'tanggal_pengajuan' => '2026-01-01', 'jumlah_hari' => 1,
                'tanggal_mulai' => '2026-01-02', 'tanggal_selesai' => '2026-01-02',
                'status' => 'DISETUJUI', 'telepon' => '+6281400000003']);
            $phone = '+6281400000003';
        } elseif ($case === 'ambiguous') {
            [, $duplicate] = $this->actor();
            $duplicate->update(['telepon' => $employee->telepon]);
            $phone = $employee->telepon;
        }
        $this->postJson('/api/agent/v1/auth/verify-phone', ['phone' => $phone])->assertNotFound();
        $employee->update(['telepon' => '0812-0000 0001']);
        $this->postJson('/api/agent/v1/auth/verify-phone', ['phone' => '+6281200000001'])
            ->assertOk()->assertJsonPath('data.id', $employee->id);
    }

    public function test_nested_snapshot_text_shapes_are_checked_on_every_document_writer(): void
    {
        [$admin, $employee] = $this->actor('admin', ['surat_tugas']);
        $letter = $this->letter($employee, ['status' => 'draft']);
        $payload = ['maksud_tujuan' => 'Dummy shape validation', 'tanggal_mulai' => '2026-12-01',
            'tanggal_selesai' => '2026-12-02', 'sumber_dana' => 'dipa', 'employees' => [['id' => $employee->id]]];
        $malformed = [
            ['employee_departures' => [$employee->id => ['dummy' => 'shape']]],
            ['header_title' => ['dummy' => 'shape']],
            ['signer_authority_mandate' => ['dummy' => 'shape']],
            ['untuk' => [['id' => 'dummy', 'text' => ['dummy' => 'shape']]]],
            ['employee_dates' => [$employee->id => ['mulai' => ['dummy' => 'shape'], 'selesai' => '2026-12-02']]],
        ];
        foreach (['public', 'store', 'update', 'approve'] as $writer) {
            if ($writer !== 'public') Sanctum::actingAs($admin);
            foreach ($malformed as $configuration) {
                $data = $payload + ['template_snapshot' => ['configuration' => $configuration]];
                $response = match ($writer) {
                    'public' => $this->postJson('/api/surat-tugas/submit', $data),
                    'store' => $this->postJson('/api/surat-tugas', $data),
                    'update' => $this->putJson('/api/surat-tugas/'.$letter->id, $data),
                    'approve' => $this->putJson('/api/surat-tugas/'.$letter->id.'/approve', $data),
                };
                $response->assertUnprocessable();
                $this->assertSame(1, AssignmentLetter::count());
                $this->assertNull($letter->fresh()->template_snapshot);
            }
        }
    }

    #[DataProvider('sharedPhotoCases')]
    public function test_photo_cleanup_preserves_all_other_employee_references(bool $replace, bool $trashed): void
    {
        [$owner, $employee] = $this->actor();
        [$protectedUser, $protected] = $this->actor('super_admin', [], $replace ? '198001012005011001' : null);
        $path = 'employees/dummy-shared.png';
        $bytes = base64_decode('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jRZkAAAAASUVORK5CYII=');
        Storage::put($path, $bytes);
        $employee->update(['foto_profil' => $path]);
        $protected->update(['foto_profil' => $path]);
        if ($trashed) $protected->delete();
        if ($replace) {
            Sanctum::actingAs($owner);
            $tmp = tempnam(sys_get_temp_dir(), 'dummy-photo-');
            try {
                file_put_contents($tmp, $bytes);
                $this->post('/api/me/update-photo', ['foto' => new UploadedFile($tmp, 'dummy.png', 'image/png', null, true)], ['Accept' => 'application/json'])->assertOk();
            } finally {
                if (is_file($tmp)) unlink($tmp);
            }
            $this->assertStringStartsWith('employees/emp-'.$employee->id.'/foto-profil/', $employee->fresh()->foto_profil);
        } else {
            [$admin] = $this->actor('admin', ['kepegawaian']);
            Sanctum::actingAs($admin);
            $this->deleteJson('/api/kepegawaian/employees/'.$protected->id.'/force')->assertForbidden();
            $this->deleteJson('/api/kepegawaian/employees/'.$employee->id.'/force')->assertOk();
        }
        $this->assertSame($path, Employee::withoutGlobalScopes()->withTrashed()->findOrFail($protected->id)->foto_profil);
        Storage::assertExists($path);
        $this->assertSame($bytes, Storage::get($path));
    }
}
