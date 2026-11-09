<?php

namespace Tests\Feature;

use App\Events\AdminInboxChanged;
use App\Events\PortalNotificationCreated;
use App\Models\PortalNotification;
use App\Models\User;
use App\Modules\Kepegawaian\Models\Employee;
use App\Modules\Kepegawaian\Models\EmployeeLeave;
use App\Modules\Kepegawaian\Models\EmployeeLeaveRequest;
use App\Modules\Kepegawaian\Models\LeaveType;
use App\Modules\SuratTugas\Models\AssignmentLetter;
use App\Services\PortalNotificationService;
use Illuminate\Support\Facades\Bus;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Event;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;
use Laravel\Sanctum\Sanctum;
use PHPUnit\Framework\Attributes\DataProvider;
use Tests\TestCase;

/** Real Laravel HTTP/DB; broadcast transport and external archive jobs are faked. */
class PortalNotificationLifecycleTest extends TestCase
{
    private User $admin;
    private array $users = [];
    private array $employees = [];

    protected function setUp(): void
    {
        parent::setUp();
        if (! app()->environment('testing') || config('database.default') !== 'sqlite'
            || config('database.connections.sqlite.database') !== ':memory:') {
            throw new \LogicException('Disposable SQLite memory database required.');
        }
        $this->artisan('migrate:fresh', ['--force' => true]);
        config(['auth.two_factor_enforce' => false]);
        Storage::fake('local');
        Bus::fake();
        Event::fake([AdminInboxChanged::class, PortalNotificationCreated::class]);
        foreach (['A', 'B', 'C', 'R'] as $index => $name) {
            $nip = '90000000000000009'.$index;
            $this->employees[$name] = Employee::create(['nip' => $nip, 'nama_lengkap' => 'Dummy R8 '.$name, 'is_active' => true]);
            $this->users[$name] = User::factory()->create(['username' => $nip, 'name' => 'Dummy R8 '.$name,
                'role' => 'user', 'access_modules' => ['surat_tugas'], 'permissions' => [],
                'is_active' => true, 'must_change_password' => false]);
        }
        $this->admin = User::factory()->create(['role' => 'admin', 'access_modules' => ['surat_tugas', 'kepegawaian'],
            'permissions' => [], 'is_active' => true, 'must_change_password' => false]);
    }

    private function letter(string $status = 'pending', int $day = 1, array $roster = ['A', 'B'], ?User $creator = null): AssignmentLetter
    {
        $letter = AssignmentLetter::create(['nomor_surat' => 'R8/DUMMY/'.Str::uuid(),
            'maksud_tujuan' => 'Dummy R8 private assignment', 'tempat_tujuan' => 'Dummy area',
            'tanggal_mulai' => sprintf('2026-12-%02d', $day), 'tanggal_selesai' => sprintf('2026-12-%02d', $day),
            'sumber_dana' => 'dipa', 'status' => $status, 'created_by' => ($creator ?? $this->admin)->id]);
        foreach ($roster as $name) $letter->employees()->attach($this->employees[$name]->id);
        return $letter;
    }

    private function notices(string $actor, ?string $reference = null)
    {
        return PortalNotification::where('user_id', $this->users[$actor]->id)
            ->when($reference, fn ($q) => $q->where('reference_id', $reference))->orderBy('id')->get();
    }

    private function approve(AssignmentLetter $letter): void
    {
        Sanctum::actingAs($this->admin);
        $this->putJson('/api/surat-tugas/'.$letter->id.'/approve', ['status' => 'approved'])->assertOk();
    }

    public static function publicationDoors(): array
    {
        return [['store', 'approved'],
            ['update', 'approved'], ['update', 'completed'], ['update', 'published'], ['update', 'diterbitkan'],
            ['approve', 'approved'], ['status', 'approved'], ['status', 'completed']];
    }

    #[DataProvider('publicationDoors')]
    public function test_stn_01_02_all_native_publication_writers_notify_only_assigned_people(string $door, string $status): void
    {
        Sanctum::actingAs($this->admin);
        $payload = ['nomor_surat' => 'R8/DUMMY/WRITER', 'maksud_tujuan' => 'Dummy native publication',
            'tanggal_mulai' => '2026-12-01', 'tanggal_selesai' => '2026-12-01', 'sumber_dana' => 'dipa',
            'employees' => [['id' => $this->employees['A']->id], ['id' => $this->employees['B']->id]], 'status' => $status];
        if ($door === 'store') {
            $id = $this->postJson('/api/surat-tugas', $payload)->assertCreated()->json('data.id');
        } else {
            $letter = $this->letter();
            $url = '/api/surat-tugas/'.$letter->id.($door === 'update' ? '' : '/'.$door);
            $this->putJson($url, $payload)->assertOk();
            $id = $letter->id;
        }
        $this->assertSame($status, AssignmentLetter::findOrFail($id)->status);
        foreach (['A', 'B'] as $name) {
            $notice = $this->notices($name, $id)->sole();
            $this->assertSame('surat_tugas', $notice->type);
            $this->assertSame('surat_tugas', $notice->action_tab);
            $this->assertSame($status, strtolower($notice->data['status']));
        }
        $this->assertCount(0, $this->notices('C'));
        Sanctum::actingAs($this->users['A']);
        $this->getJson('/api/surat-tugas/my/'.$id)->assertOk()->assertJsonPath('data.id', $id);
        Sanctum::actingAs($this->users['C']);
        $this->getJson('/api/surat-tugas/my/'.$id)->assertForbidden();
    }

    public function test_stn_03_04_05_approval_history_survives_trash_and_restore_with_precise_personal_notices(): void
    {
        $letter = $this->letter();
        $this->approve($letter);
        $original = $this->notices('A', $letter->id)->sole();
        $originalB = $this->notices('B', $letter->id)->sole();
        Sanctum::actingAs($this->users['A']);
        $this->postJson('/api/portal/notifications/'.$original->id.'/read')->assertOk();
        $readAt = $original->fresh()->read_at->toISOString();
        Sanctum::actingAs($this->admin);
        $this->deleteJson('/api/surat-tugas/'.$letter->id)->assertOk();
        $this->assertTrue($letter->fresh()->trashed());
        foreach (['A', 'B'] as $name) {
            $all = $this->notices($name, $letter->id);
            $this->assertCount(2, $all, 'Trash must add one accurate availability-change notice per existing recipient.');
            $this->assertSame('Surat Tugas Dipindahkan ke Sampah', $all->last()->title);
            $this->assertStringNotContainsString('dibatalkan', strtolower($all->last()->message));
        }
        $this->assertSame($readAt, $original->fresh()->read_at->toISOString());
        $this->assertNull($originalB->fresh()->read_at);
        $this->assertSame('approved', $original->fresh()->data['status']);
        Sanctum::actingAs($this->users['A']);
        $this->getJson('/api/surat-tugas/my/'.$letter->id)->assertNotFound();
        $this->getJson('/api/surat-tugas/my/'.$letter->id.'/download')->assertNotFound();
        $this->assertNotContains($letter->id, $this->getJson('/api/surat-tugas/my')->assertOk()->json('data.*.id'));
        Sanctum::actingAs($this->admin);
        $this->postJson('/api/surat-tugas/'.$letter->id.'/restore')->assertOk();
        foreach (['A', 'B'] as $name) {
            $this->assertCount(3, $this->notices($name, $letter->id));
            $this->assertSame('Surat Tugas Dipulihkan', $this->notices($name, $letter->id)->last()->title);
        }
        $this->assertCount(0, $this->notices('C'));
        Sanctum::actingAs($this->users['A']);
        $this->getJson('/api/surat-tugas/my/'.$letter->id)->assertOk();
    }

    public function test_stn_06_force_delete_leaves_historical_notices_but_no_personal_document(): void
    {
        $letter = $this->letter(); $this->approve($letter);
        $oldIds = PortalNotification::where('reference_id', $letter->id)->pluck('id')->all();
        $this->deleteJson('/api/surat-tugas/'.$letter->id)->assertOk();
        $this->deleteJson('/api/surat-tugas/'.$letter->id.'/force')->assertOk();
        $this->assertNull(AssignmentLetter::withTrashed()->find($letter->id));
        $this->assertSame(count($oldIds), PortalNotification::whereIn('id', $oldIds)->count());
        Sanctum::actingAs($this->users['A']);
        $this->getJson('/api/surat-tugas/my/'.$letter->id)->assertNotFound();
        $this->getJson('/api/surat-tugas/my/'.$letter->id.'/download')->assertNotFound();
    }

    public function test_stn_07_bulk_trash_and_restore_notices_follow_changed_rows_and_retry_is_not_a_new_transition(): void
    {
        $first = $this->letter('approved', 1); $second = $this->letter('approved', 2);
        Sanctum::actingAs($this->admin);
        $ids = [$first->id, $second->id, $first->id, (string) Str::uuid()];
        $this->postJson('/api/surat-tugas/bulk-trash', ['ids' => $ids])->assertOk();
        $this->assertTrue($first->fresh()->trashed()); $this->assertTrue($second->fresh()->trashed());
        foreach (['A', 'B'] as $name) $this->assertCount(2, $this->notices($name));
        $before = PortalNotification::count();
        $this->postJson('/api/surat-tugas/bulk-trash', ['ids' => $ids])->assertOk();
        $this->assertSame($before, PortalNotification::count());
        $this->postJson('/api/surat-tugas/bulk-restore', ['ids' => $ids])->assertOk();
        Event::assertDispatchedTimes(AdminInboxChanged::class, 3);
        Event::assertDispatched(AdminInboxChanged::class, fn ($event) => $event->action === 'restored');
        foreach (['A', 'B'] as $name) $this->assertCount(4, $this->notices($name));
        $before = PortalNotification::count();
        $this->postJson('/api/surat-tugas/bulk-restore', ['ids' => $ids])->assertOk();
        Event::assertDispatchedTimes(AdminInboxChanged::class, 3);
        $this->assertSame($before, PortalNotification::count());
        $this->assertCount(0, $this->notices('C'));
    }

    public function test_stn_05_07_failed_mixed_restore_keeps_rows_and_notification_records_atomic(): void
    {
        $safe = $this->letter('approved', 2); $safe->delete();
        $bad = $this->letter('approved', 1); $bad->delete();
        $active = $this->letter('pending', 1);
        $before = PortalNotification::count();
        $intermediate = [];
        Event::listen('eloquent.restored: '.AssignmentLetter::class, function ($row) use ($safe, &$intermediate) {
            if ($row->id === $safe->id) $intermediate[] = DB::transactionLevel();
        });
        Sanctum::actingAs($this->admin);
        $this->postJson('/api/surat-tugas/bulk-restore', ['ids' => [$safe->id, $bad->id]])->assertUnprocessable();
        $this->assertCount(1, $intermediate, 'The safe first row was restored before the later conflict.');
        $this->assertGreaterThan(0, $intermediate[0]);
        $this->assertTrue($safe->fresh()->trashed()); $this->assertTrue($bad->fresh()->trashed());
        $this->assertFalse($active->fresh()->trashed());
        $this->assertSame($before, PortalNotification::count());
        fwrite(STDOUT, json_encode(['case' => 'STN-05/07', 'restored_transaction_levels' => $intermediate,
            'rows_and_notices_rolled_back' => true], JSON_THROW_ON_ERROR).PHP_EOL);
    }

    public function test_stn_08_creator_cannot_trash_official_letter_or_notify_anyone(): void
    {
        $letter = $this->letter('approved', 1, ['A', 'B'], $this->users['R']);
        Sanctum::actingAs($this->users['R']);
        $this->deleteJson('/api/surat-tugas/'.$letter->id)->assertForbidden();
        $this->assertFalse($letter->fresh()->trashed()); $this->assertSame(0, PortalNotification::count());
        $draft = $this->letter('draft', 2, ['A'], $this->users['R']);
        $this->deleteJson('/api/surat-tugas/'.$draft->id)->assertOk();
        $this->assertTrue($draft->fresh()->trashed());
    }

    public function test_stn_09_roster_changes_revoke_old_personal_access_and_inform_removed_recipient(): void
    {
        $letter = $this->letter(); $this->approve($letter);
        $this->putJson('/api/surat-tugas/'.$letter->id.'/approve', ['status' => 'approved',
            'employees' => [['id' => $this->employees['B']->id], ['id' => $this->employees['C']->id]]])->assertOk();
        $this->assertCount(2, $this->notices('A', $letter->id), 'Removed recipient must receive a minimal access-withdrawal notice.');
        $this->assertCount(2, $this->notices('B', $letter->id));
        $this->assertCount(1, $this->notices('C', $letter->id));
        Sanctum::actingAs($this->users['A']);
        $this->getJson('/api/surat-tugas/my/'.$letter->id)->assertForbidden();
        Sanctum::actingAs($this->users['C']);
        $this->getJson('/api/surat-tugas/my/'.$letter->id)->assertOk();
    }

    public function test_pn_02_read_and_history_are_scoped_and_idempotent(): void
    {
        $service = app(PortalNotificationService::class);
        $a = $service->notifyEmployee($this->employees['A'], 'Dummy A', 'Dummy private A');
        $b = $service->notifyEmployee($this->employees['B'], 'Dummy B', 'Dummy private B');
        Sanctum::actingAs($this->users['A']);
        $this->getJson('/api/portal/notifications')->assertOk()->assertJsonPath('meta.unread_count', 1)->assertJsonCount(1, 'data');
        $this->postJson('/api/portal/notifications/'.$b->id.'/read')->assertNotFound();
        $this->postJson('/api/portal/notifications/'.$a->id.'/read')->assertOk()->assertJsonPath('unread_count', 0);
        $firstRead = $a->fresh()->read_at->toISOString();
        $this->postJson('/api/portal/notifications/'.$a->id.'/read')->assertOk();
        $this->assertSame($firstRead, $a->fresh()->read_at->toISOString());
        $this->postJson('/api/portal/notifications/mark-all-read')->assertOk();
        $this->assertNull($b->fresh()->read_at);
    }

    private function submitLeave(): EmployeeLeaveRequest
    {
        LeaveType::create(['nama' => 'Dummy R8 Annual', 'kode' => 'DUMMY_R8', 'hitung_hari' => 'hari_kerja',
            'potong_kuota_tahunan' => true, 'maks_hari' => 12, 'is_active' => true]);
        EmployeeLeave::create(['employee_id' => $this->employees['A']->id, 'year' => 2026, 'hak_cuti_n' => 12, 'cuti_terpakai_n0' => 0]);
        Sanctum::actingAs($this->users['A']);
        $id = $this->postJson('/api/me/leave-requests', ['jenis_cuti' => 'Dummy R8 Annual',
            'tanggal_mulai' => '2026-12-14', 'tanggal_selesai' => '2026-12-14',
            'alasan_cuti' => 'Dummy private reason', 'alamat_menjalankan_cuti' => 'Dummy private place'])->assertCreated()->json('data.id');
        return EmployeeLeaveRequest::findOrFail($id);
    }

    public function test_kn_01_02_leave_decision_retry_does_not_duplicate_notice_or_debit_then_delete_restores_balance(): void
    {
        $leave = $this->submitLeave();
        $this->assertSame(1, $leave->jumlah_hari);
        $this->assertGreaterThan(0, PortalNotification::where('user_id', $this->admin->id)->where('reference_id', (string) $leave->id)->count());
        $this->assertStringContainsString($this->employees['A']->nama_lengkap,
            PortalNotification::where('user_id', $this->admin->id)->where('reference_id', (string) $leave->id)->firstOrFail()->message);
        Sanctum::actingAs($this->admin);
        $url = '/api/kepegawaian/leave-requests/'.$leave->id.'/status';
        $this->putJson($url, ['status' => 'DISETUJUI'])->assertOk();
        $this->assertCount(1, $this->notices('A', (string) $leave->id));
        $balance = EmployeeLeave::where('employee_id', $this->employees['A']->id)->firstOrFail();
        $this->assertSame(1, (int) $balance->cuti_terpakai_n0);
        $this->putJson($url, ['status' => 'DISETUJUI'])->assertOk();
        $this->assertCount(1, $this->notices('A', (string) $leave->id), 'Same transition retry must not notify again.');
        $this->assertSame(1, (int) $balance->fresh()->cuti_terpakai_n0);
        $this->deleteJson('/api/kepegawaian/leave-requests/'.$leave->id)->assertOk();
        $this->assertSame(0, (int) $balance->fresh()->cuti_terpakai_n0);
        $this->assertTrue($leave->fresh()->trashed());
        Sanctum::actingAs($this->users['A']);
        $this->getJson('/api/me/leave-requests/'.$leave->id)->assertNotFound();
        $this->assertCount(0, $this->notices('C'));
    }

    public function test_kn_01_02_cancel_pending_and_reject_release_reservation_without_quota_debit(): void
    {
        $leave = $this->submitLeave();
        $this->deleteJson('/api/me/leave-requests/'.$leave->id)->assertOk();
        $this->assertTrue($leave->fresh()->trashed());
        $this->assertSame(0, EmployeeLeaveRequest::where('employee_id', $this->employees['A']->id)->count());
        $this->assertSame(0, (int) EmployeeLeave::where('employee_id', $this->employees['A']->id)->value('cuti_terpakai_n0'));
        $leave = EmployeeLeaveRequest::create(['employee_id' => $this->employees['A']->id, 'jenis_cuti' => 'Dummy R8 Annual',
            'tanggal_pengajuan' => '2026-11-09', 'tanggal_mulai' => '2026-12-15', 'tanggal_selesai' => '2026-12-15',
            'jumlah_hari' => 1, 'alasan_cuti' => 'Dummy reject', 'alamat_menjalankan_cuti' => 'Dummy place', 'status' => 'PENGAJUAN']);
        Sanctum::actingAs($this->admin);
        $this->putJson('/api/kepegawaian/leave-requests/'.$leave->id.'/status', ['status' => 'DITOLAK'])->assertOk();
        $this->assertSame('DITOLAK', $leave->fresh()->status);
        $this->assertSame(0, (int) EmployeeLeave::where('employee_id', $this->employees['A']->id)->value('cuti_terpakai_n0'));
        $this->assertCount(1, $this->notices('A', (string) $leave->id));
        Sanctum::actingAs($this->users['A']);
        $this->deleteJson('/api/me/leave-requests/'.$leave->id)->assertUnprocessable();
        $this->assertFalse($leave->fresh()->trashed());
    }

    public function test_kn_03_mapping_supports_documented_nip_input_and_skips_inactive_or_missing_recipients(): void
    {
        $service = app(PortalNotificationService::class);
        $this->users['A']->update(['is_active' => false]);
        $this->assertNull($service->notifyEmployee($this->employees['A'], 'Dummy inactive', 'Dummy'));
        $missing = Employee::create(['nip' => '900000000000000098', 'nama_lengkap' => 'Dummy no account']);
        $this->assertNull($service->notifyEmployee($missing, 'Dummy missing', 'Dummy'));
        $this->assertSame(0, PortalNotification::count());
        $this->assertNotNull($service->notifyEmployee($this->employees['R'], 'Dummy object', 'Dummy'));
        $this->assertNotNull($service->notifyEmployee($this->employees['R']->id, 'Dummy integer ID', 'Dummy'));
        $this->assertNotNull($service->notifyEmployee($this->employees['R']->nip, 'Dummy documented NIP', 'Dummy'));
        $this->assertCount(3, $this->notices('R'));
        $this->assertCount(0, $this->notices('C'));
    }
    public static function repeatedPublicationDoors(): array
    {
        return [['approve'], ['status'], ['update']];
    }

    #[DataProvider('repeatedPublicationDoors')]
    public function test_stn_02_identical_publication_retry_does_not_notify_but_real_number_revision_does(string $door): void
    {
        $letter = $this->letter();
        Sanctum::actingAs($this->admin);
        $url = '/api/surat-tugas/'.$letter->id.($door === 'update' ? '' : '/'.$door);
        $payload = ['status' => 'approved', 'nomor_surat' => $letter->nomor_surat,
            'maksud_tujuan' => $letter->maksud_tujuan, 'tanggal_mulai' => '2026-12-01',
            'tanggal_selesai' => '2026-12-01', 'sumber_dana' => 'dipa',
            'employees' => [['id' => $this->employees['A']->id], ['id' => $this->employees['B']->id]]];
        $this->putJson($url, $payload)->assertOk();
        foreach (['A', 'B'] as $name) $this->assertCount(1, $this->notices($name, $letter->id));
        $this->putJson($url, $payload)->assertOk();
        foreach (['A', 'B'] as $name) $this->assertCount(1, $this->notices($name, $letter->id), 'An identical retry is not another publication.');
        $payload['nomor_surat'] = 'R8/DUMMY/REVISED';
        $this->putJson($url, $payload)->assertOk();
        $this->assertSame($payload['nomor_surat'], $letter->fresh()->nomor_surat);
        foreach (['A', 'B'] as $name) $this->assertCount(2, $this->notices($name, $letter->id), 'A real number revision must still notify.');
        $this->putJson($url, $payload)->assertOk();
        foreach (['A', 'B'] as $name) $this->assertCount(2, $this->notices($name, $letter->id));
        $this->assertCount(0, $this->notices('C'));
    }

    public static function alternateLeaveApprovalDoors(): array
    {
        return [['approve'], ['generate-surat-izin']];
    }

    #[DataProvider('alternateLeaveApprovalDoors')]
    public function test_kn_01_alternate_native_leave_writers_gate_identical_retries_without_losing_real_revisions(string $door): void
    {
        $leave = $this->submitLeave();
        Sanctum::actingAs($this->admin);
        $url = '/api/kepegawaian/leave-requests/'.$leave->id.'/'.$door;
        $payload = ['nomor_surat' => 'R8/DUMMY/CUTI', 'catatan_atasan' => 'Dummy approved note'];
        if ($door === 'generate-surat-izin') $payload['tanggal_surat'] = '2026-11-09';
        $this->postJson($url, $payload)->assertOk();
        $this->assertSame('DISETUJUI', $leave->fresh()->status);
        $this->assertSame(1, (int) EmployeeLeave::where('employee_id', $this->employees['A']->id)->value('cuti_terpakai_n0'));
        $this->assertCount(1, $this->notices('A', (string) $leave->id));
        $documentId = $leave->fresh()->surat_keluar_id;
        if ($door === 'generate-surat-izin') {
            $this->assertNotNull($documentId);
            $this->assertDatabaseHas('surat_keluar', ['id' => $documentId, 'no_surat' => $payload['nomor_surat']]);
        }
        $this->postJson($url, $payload)->assertOk();
        $this->assertSame(1, (int) EmployeeLeave::where('employee_id', $this->employees['A']->id)->value('cuti_terpakai_n0'));
        $this->assertCount(1, $this->notices('A', (string) $leave->id), 'An identical alternate approval retry must not notify again.');
        $this->assertSame($documentId, $leave->fresh()->surat_keluar_id);
        $payload['nomor_surat'] = 'R8/DUMMY/CUTI-REVISED';
        $this->postJson($url, $payload)->assertOk();
        $this->assertSame($payload['nomor_surat'], $leave->fresh()->nomor_pengajuan);
        $this->assertCount(2, $this->notices('A', (string) $leave->id), 'Genuine number revision remains visible to the recipient.');
        $this->assertSame(1, (int) EmployeeLeave::where('employee_id', $this->employees['A']->id)->value('cuti_terpakai_n0'));
        $this->postJson($url, $payload)->assertOk();
        $this->assertCount(2, $this->notices('A', (string) $leave->id));
        $this->assertSame($documentId, $leave->fresh()->surat_keluar_id);
        $this->assertCount(0, $this->notices('C'));
    }

    public function test_kn_02_cancel_and_delete_keep_historical_notice_but_revoke_the_reference(): void
    {
        $leave = $this->submitLeave();
        $adminNoticeIds = PortalNotification::where('user_id', $this->admin->id)->where('reference_id', (string) $leave->id)->pluck('id')->all();
        $this->assertNotEmpty($adminNoticeIds);
        $this->deleteJson('/api/me/leave-requests/'.$leave->id)->assertOk();
        $this->getJson('/api/me/leave-requests/'.$leave->id)->assertNotFound();
        Sanctum::actingAs($this->admin);
        $this->getJson('/api/kepegawaian/leave-requests/'.$leave->id)->assertNotFound();
        $this->assertSame(count($adminNoticeIds), PortalNotification::whereIn('id', $adminNoticeIds)->count());
        $this->assertSame(0, (int) EmployeeLeave::where('employee_id', $this->employees['A']->id)->value('cuti_terpakai_n0'));

        $active = EmployeeLeaveRequest::create(['employee_id' => $this->employees['A']->id, 'jenis_cuti' => 'Dummy R8 Annual',
            'tanggal_pengajuan' => '2026-11-09', 'tanggal_mulai' => '2026-12-15', 'tanggal_selesai' => '2026-12-15',
            'jumlah_hari' => 1, 'alasan_cuti' => 'Dummy second request', 'alamat_menjalankan_cuti' => 'Dummy place', 'status' => 'PENGAJUAN']);
        $this->putJson('/api/kepegawaian/leave-requests/'.$active->id.'/status', ['status' => 'DISETUJUI'])->assertOk();
        $notice = $this->notices('A', (string) $active->id)->sole();
        $this->deleteJson('/api/kepegawaian/leave-requests/'.$active->id)->assertOk();
        $this->assertTrue($active->fresh()->trashed());
        $this->assertSame('DISETUJUI', $notice->fresh()->data['status'], 'The approval notice is historical, not a current availability assertion.');
        $this->assertSame(0, (int) EmployeeLeave::where('employee_id', $this->employees['A']->id)->value('cuti_terpakai_n0'));
        Sanctum::actingAs($this->users['A']);
        $this->getJson('/api/me/leave-requests/'.$active->id)->assertNotFound();
        $this->getJson('/api/portal/notifications')->assertOk();
        $this->assertNotNull($notice->fresh());
    }

    public function test_kn_04_native_reconciliation_and_schedule_projection_follow_st_trash_restore(): void
    {
        $letter = $this->letter();
        $letter->update(['tanggal_mulai' => '2026-09-02', 'tanggal_selesai' => '2026-09-02']);
        $this->approve($letter);
        $originalNotice = $this->notices('A', $letter->id)->sole();
        $html = '<html><body><table><tr><td>NAMA</td><td>Dummy</td></tr><tr><td>NIP</td><td>'.$this->employees['A']->nip.'</td></tr>'
            .'<tr><td>BULAN</td><td>September 2026</td></tr></table><table class="wbo"><tbody>'
            .'<tr><td>1</td><td>02/09/2026</td><td>Wfo</td><td>07:30</td><td>16:00</td><td></td><td></td><td></td><td></td><td></td><td>Hadir</td></tr>'
            .'</tbody></table></body></html>';
        $reconcile = fn () => $this->postJson('/api/kepegawaian/uang-makan/reconcile', [
            'files' => [\Illuminate\Http\UploadedFile::fake()->createWithContent('dummy-r8-presensi.xls', $html)],
        ])->assertOk();
        $conflict = fn () => $this->postJson('/api/surat-tugas/check-conflicts', ['employee_ids' => [$this->employees['A']->id],
            'tanggal_mulai' => '2026-09-02', 'tanggal_selesai' => '2026-09-02'])->assertOk();
        $history = '/api/kepegawaian/employees/'.$this->employees['A']->id.'/assignment-letters';
        $reconcile()->assertJsonPath('data.items.0.daily_matrix.2.status', 'PD');
        $conflict()->assertJsonPath('has_conflict', true);
        $this->getJson($history)->assertOk()->assertJsonCount(1, 'data');
        $this->deleteJson('/api/surat-tugas/'.$letter->id)->assertOk();
        $this->assertSame('approved', $letter->fresh()->status, 'Trash changes availability, not the recorded publication status.');
        $reconcile()->assertJsonPath('data.items.0.daily_matrix.2.status', 'H');
        $conflict()->assertJsonPath('has_conflict', false);
        $this->getJson($history)->assertOk()->assertJsonCount(0, 'data');
        $this->postJson('/api/surat-tugas/'.$letter->id.'/restore')->assertOk();
        $reconcile()->assertJsonPath('data.items.0.daily_matrix.2.status', 'PD');
        $conflict()->assertJsonPath('has_conflict', true);
        $this->getJson($history)->assertOk()->assertJsonCount(1, 'data');
        $this->assertSame('approved', $originalNotice->fresh()->data['status']);
        fwrite(STDOUT, json_encode(['case' => 'KN-04', 'projection' => ['active' => 'PD/conflict/history-present',
            'trashed' => 'H/no-conflict/history-absent', 'restored' => 'PD/conflict/history-present'],
            'scope' => 'Source-contract characterization;does not establish legal payroll entitlement or equate trash with cancellation.'], JSON_THROW_ON_ERROR).PHP_EOL);
    }


    public function test_pn_02_native_history_pagination_filters_and_equal_timestamp_order(): void
    {
        $ids = [];
        for ($i = 0; $i < 20; $i++) {
            $notice = app(PortalNotificationService::class)->notifyEmployee($this->employees['A'], 'Dummy row '.$i, 'Dummy history', $i % 2 ? 'cuti' : 'surat_tugas');
            $notice->forceFill(['created_at' => '2026-11-09 00:00:00'])->save();
            if ($i < 6) $notice->update(['read_at' => now()]);
            $ids[] = $notice->id;
        }
        app(PortalNotificationService::class)->notifyEmployee($this->employees['C'], 'Dummy foreign', 'Dummy foreign body');
        Sanctum::actingAs($this->users['A']);
        $first = $this->getJson('/api/portal/notifications?per_page=7')->assertOk()->assertJsonPath('meta.total', 20)->assertJsonPath('meta.unread_count', 14)->json('data.*.id');
        $second = $this->getJson('/api/portal/notifications?per_page=7&page=2')->assertOk()->assertJsonPath('meta.current_page', 2)->json('data.*.id');
        $this->assertSame(array_slice(array_reverse($ids), 0, 7), $first);
        $this->assertSame(array_slice(array_reverse($ids), 7, 7), $second);
        $this->assertSame([], array_values(array_intersect($first, $second)));
        $this->getJson('/api/portal/notifications?read_only=1')->assertOk()->assertJsonPath('meta.total', 6);
        $this->getJson('/api/portal/notifications?unread_only=1&type=cuti')->assertOk()->assertJsonPath('meta.total', 7);
        $this->getJson('/api/portal/notifications?per_page=999')->assertOk()->assertJsonPath('meta.per_page', 50);
    }

    public function test_kn_03_native_employee_nip_change_preserves_recipient_and_retires_old_mapping(): void
    {
        $old = $this->employees['A']->nip;
        $new = '900000000000000077';
        Sanctum::actingAs($this->admin);
        $this->putJson('/api/kepegawaian/employees/'.$this->employees['A']->id, ['nip' => $new, 'nama_lengkap' => $this->employees['A']->nama_lengkap])->assertOk();
        $this->assertSame($new, $this->users['A']->fresh()->username);
        $service = app(PortalNotificationService::class);
        $this->assertNull($service->notifyEmployee($old, 'Dummy retired identity', 'Dummy'));
        $notice = $service->notifyEmployee($new, 'Dummy current identity', 'Dummy');
        $this->assertNotNull($notice);
        $this->assertSame($this->users['A']->id, $notice->user_id);
        $this->assertSame($this->employees['A']->id, $notice->employee_id);
        $this->assertCount(0, $this->notices('C'));
    }
}
