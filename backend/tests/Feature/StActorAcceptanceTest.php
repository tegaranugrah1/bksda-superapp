<?php

namespace Tests\Feature;

use App\Events\AdminInboxChanged;
use App\Events\PortalNotificationCreated;
use App\Jobs\ArchiveOfficialDocument;
use App\Models\User;
use App\Modules\Agent\Jobs\DispatchSuratTugasWebhook;
use App\Modules\Kepegawaian\Models\Employee;
use App\Modules\Kepegawaian\Models\EmployeeLeaveRequest;
use App\Modules\SuratTugas\Models\AssignmentLetter;
use Illuminate\Support\Facades\Bus;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Event;
use Illuminate\Support\Facades\Storage;
use Tests\TestCase;

/** Native HTTP kernel, actual auth/module middleware, disposable full-schema DB. */
class StActorAcceptanceTest extends TestCase
{
    private int $sequence = 0;
    private const PDF = "%PDF-1.4\nDUMMY_ST_ACTOR_PRIVATE_BYTES\n%%EOF";

    protected function setUp(): void
    {
        parent::setUp();
        if (! app()->environment('testing') || config('database.default') !== 'sqlite'
            || config('database.connections.sqlite.database') !== ':memory:') {
            throw new \LogicException('Requires disposable SQLite memory DB.');
        }
        $this->artisan('migrate:fresh', ['--force' => true]);
        config(['auth.two_factor_enforce' => false, 'filesystems.default' => 'local']);
        Storage::fake('local');
        Event::fake([AdminInboxChanged::class, PortalNotificationCreated::class]);
        Bus::fake([ArchiveOfficialDocument::class, DispatchSuratTugasWebhook::class]);
    }

    private function actor(string $role = 'user', array $modules = [], array $permissions = []): array
    {
        $nip = '90000000000000'.str_pad((string) ++$this->sequence, 4, '0', STR_PAD_LEFT);
        $employee = Employee::create([
            'nip' => $nip, 'nama_lengkap' => 'Dummy Actor '.$this->sequence, 'is_active' => true,
            'nama_bank' => 'DUMMY_PRIVATE_BANK', 'nomor_rekening' => 'DUMMY_PRIVATE_ACCOUNT',
            'telepon' => 'DUMMY_PRIVATE_PHONE', 'email' => 'dummy-private@example.test',
        ]);
        $user = User::factory()->create([
            'username' => $nip, 'email' => $nip.'@example.test', 'role' => $role,
            'access_modules' => $modules, 'permissions' => $permissions,
            'is_active' => true, 'must_change_password' => false,
        ]);
        return [$user, $employee];
    }

    private function asBearer(?User $user): void
    {
        $this->flushHeaders();
        $this->app['auth']->forgetGuards();
        if ($user) $this->withToken($user->createToken('dummy-st-actor')->plainTextToken);
    }

    private function payload(Employee ...$employees): array
    {
        return [
            'status' => 'approved', 'nomor_surat' => 'ST/DUMMY/A7/2026',
            'maksud_tujuan' => 'Dummy valid actor assignment', 'sumber_dana' => 'dipa',
            'tanggal_mulai' => '2026-11-20', 'tanggal_selesai' => '2026-11-21',
            'employees' => array_map(fn ($e) => ['id' => $e->id], $employees),
        ];
    }

    public function test_same_valid_a7_payload_private_public_and_authorized_control_with_db_state(): void
    {
        [$a7, $employee] = $this->actor('admin', ['keuangan'], ['surat_tugas.approve']);
        [$authorized] = $this->actor('admin', ['surat_tugas']); // native admin OR permission policy
        [$forged] = $this->actor();
        $payload = $this->payload($employee) + ['created_by' => $forged->id, 'approved_by' => $forged->id,
            'id' => '11111111-1111-4111-8111-111111111111'];
        $encoded = json_encode($payload);
        // Roll each door back to identical DB schedule state; never change the A7 payload.
        foreach ([[$a7, '/api/surat-tugas', 403, null],
            [$a7, '/api/surat-tugas/submit', 201, 'pending'],
            [$authorized, '/api/surat-tugas', 201, 'approved'],
            [$forged, '/api/surat-tugas/submit', 201, 'pending'],
            [null, '/api/surat-tugas/submit', 201, 'pending']] as [$actor, $url, $code, $status]) {
            $this->asBearer($actor);
            DB::beginTransaction();
            try {
                $before = AssignmentLetter::count();
                $response = $this->postJson($url, $payload)->assertStatus($code);
                $this->assertSame($encoded, json_encode($payload));
                if ($status === null) {
                    $this->assertSame($before, AssignmentLetter::count());
                } else {
                    $letter = AssignmentLetter::findOrFail($response->json('data.id'));
                    $this->assertSame($before + 1, AssignmentLetter::count());
                    $this->assertSame($status, $letter->status);
                    if ($actor) $this->assertSame($actor->id, (int) $letter->created_by);
                    else $this->assertNull($letter->created_by);
                    if ($status === 'approved') $this->assertSame($actor->id, (int) $letter->approved_by);
                    else $this->assertNull($letter->approved_by);
                    $this->assertSame($payload['nomor_surat'], $letter->nomor_surat);
                    $this->assertNotSame($payload['id'], $letter->id);
                    $this->assertSame([$employee->id], $letter->employees()->pluck('kpg_employees.id')->all());
                    if (str_ends_with($url, '/submit')) {
                        $this->assertSame(['id', 'status', 'created_by', 'approved_by'], array_keys($response->json('data')));
                        foreach (['DUMMY_PRIVATE_BANK', 'DUMMY_PRIVATE_ACCOUNT', 'DUMMY_PRIVATE_PHONE', 'dummy-private@example.test'] as $marker) {
                            $this->assertStringNotContainsString($marker, $response->getContent());
                        }
                    }
                }
            } finally { DB::rollBack(); }
            $this->assertSame(0, AssignmentLetter::count());
        }
        $this->asBearer(null);
        $this->postJson('/api/surat-tugas/submit', ['status' => 'draft', 'maksud_tujuan' => 'Dummy draft'])
            ->assertUnprocessable()->assertJsonValidationErrors(['tanggal_mulai', 'tanggal_selesai', 'sumber_dana', 'employees']);
        $this->assertSame(0, AssignmentLetter::count());
    }

    public function test_anonymous_conflict_preview_and_submit_422_redact_both_private_sentinels(): void
    {
        [, $onAssignment] = $this->actor();
        [, $onLeave] = $this->actor();
        [$admin] = $this->actor('admin', ['kepegawaian']);
        $existing = AssignmentLetter::create($this->payload($onAssignment) + ['created_by' => $admin->id]);
        $existing->update(['maksud_tujuan' => 'DUMMY_PRIVATE_INTERNAL_PURPOSE', 'nomor_surat' => 'DUMMY_PRIVATE_ST_NUMBER']);
        $existing->employees()->attach($onAssignment->id);
        EmployeeLeaveRequest::create([
            'employee_id' => $onLeave->id, 'jenis_cuti' => 'Cuti Sakit',
            'alasan_cuti' => 'DUMMY_PRIVATE_LEAVE_REASON', 'nomor_pengajuan' => 'DUMMY_PRIVATE_LEAVE_NUMBER',
            'tanggal_pengajuan' => '2026-11-01', 'tanggal_mulai' => '2026-11-20',
            'tanggal_selesai' => '2026-11-21', 'jumlah_hari' => 2, 'status' => 'approved',
            'alamat_menjalankan_cuti' => 'Dummy address',
        ]);
        $payload = $this->payload($onAssignment, $onLeave);
        foreach ([null, $admin] as $actor) {
            $this->asBearer($actor);
            foreach ([['/api/surat-tugas/check-conflicts', 200], ['/api/surat-tugas/submit', 422]] as [$url, $status]) {
                $response = $this->postJson($url, $payload)->assertStatus($status);
                $conflicts = $response->json('conflicts');
                $this->assertCount(2, $conflicts);
                $this->assertSame(['surat_tugas', 'cuti'], array_column($conflicts, 'type'));
                foreach (['DUMMY_PRIVATE_INTERNAL_PURPOSE', 'DUMMY_PRIVATE_LEAVE_REASON',
                    'DUMMY_PRIVATE_ST_NUMBER', 'DUMMY_PRIVATE_LEAVE_NUMBER'] as $marker) {
                    if ($actor) $this->assertStringContainsString($marker, $response->getContent());
                    else $this->assertStringNotContainsString($marker, $response->getContent());
                }
                foreach ($conflicts as $conflict) {
                    $this->assertSame(['employee_id', 'employee_name', 'type', 'reference_id', 'nomor', 'keterangan',
                        'status', 'tanggal_mulai', 'tanggal_selesai', 'range_formatted', 'message'], array_keys($conflict));
                    if (! $actor) {
                        $this->assertNull($conflict['reference_id']);
                        $this->assertNull($conflict['nomor']);
                        $this->assertContains($conflict['keterangan'], ['Penugasan Aktif', 'Cuti Aktif']);
                    } else $this->assertNotNull($conflict['reference_id']);
                }
                $this->assertSame(1, AssignmentLetter::count(), 'Conflict submit must not create a letter.');
            }
        }
    }

    public function test_separate_creator_participant_foreign_representations_and_unpublished_policy(): void
    {
        [$creator, $creatorEmployee] = $this->actor();
        [$participant, $participantEmployee] = $this->actor();
        [$stranger] = $this->actor();
        [$a7] = $this->actor('admin', ['keuangan']);
        $letter = AssignmentLetter::create($this->payload($participantEmployee) + ['created_by' => $creator->id]);
        $letter->employees()->attach($participantEmployee->id);
        $this->assertFalse($letter->employees->contains('id', $creatorEmployee->id));
        $this->assertNotEquals($participant->id, $letter->created_by);
        $path = 'audit-fixtures/st-actor.pdf';
        Storage::disk('local')->put($path, self::PDF);
        $letter->update(['file_surat_path' => $path]);

        foreach ([$creator, $participant] as $actor) {
            $this->asBearer($actor);
            foreach (['', '?mobile=1'] as $suffix) {
                $list = $this->getJson('/api/surat-tugas/my'.$suffix)->assertOk();
                $this->assertCount(1, $list->json('data'));
                $this->assertSame($letter->id, $list->json('data.0.id'));
                $detail = $this->getJson('/api/surat-tugas/my/'.$letter->id.$suffix)->assertOk();
                $detail->assertJsonPath('data.id', $letter->id);
                if ($suffix) {
                    $detail->assertJsonPath('data.file.download_url', '/api/surat-tugas/my/'.$letter->id.'/download')
                        ->assertJsonPath('data.file_surat_path', 'st-actor.pdf')
                        ->assertJsonPath('data.allowed_actions.can_update', false)
                        ->assertJsonPath('data.allowed_actions.can_approve', false)
                        ->assertJsonPath('data.allowed_actions.can_delete', false);
                }
            }
            $this->allowedFile($letter);
        }
        foreach ([$stranger, $a7] as $actor) {
            $this->asBearer($actor);
            $this->getJson('/api/surat-tugas/my?employee_id='.$participantEmployee->id)->assertOk()->assertJsonCount(0, 'data');
            $this->deniedRepresentations($letter, 403, 404);
        }
        Storage::disk('local')->delete($path);
        foreach ([$creator, $participant] as $actor) {
            $this->asBearer($actor);
            $this->fallback($letter);
        }
        foreach ([$stranger, $a7] as $actor) {
            $this->asBearer($actor);
            $this->deniedRepresentations($letter, 403, 404);
        }
        foreach (['draft', 'pending', 'rejected'] as $status) {
            $letter->update(['status' => $status]);
            $this->asBearer($creator);
            $this->getJson('/api/surat-tugas/my')->assertOk()->assertJsonCount(0, 'data');
            $this->getJson('/api/surat-tugas/my/'.$letter->id)->assertOk();
            $this->fallback($letter);
            $this->asBearer($participant);
            $this->getJson('/api/surat-tugas/my')->assertOk()->assertJsonCount(0, 'data');
            $this->deniedRepresentations($letter, 403, 403);
        }
    }

    private function allowedFile(AssignmentLetter $letter): void
    {
        foreach (['?preview=1', ''] as $suffix) {
            $response = $this->getJson('/api/surat-tugas/my/'.$letter->id.'/download'.$suffix)->assertOk();
            $this->assertSame('application/pdf', $response->json('mime_type'));
            $this->assertSame(self::PDF, base64_decode(explode(',', $response->json('data_url'), 2)[1], true));
        }
        $binary = $this->get('/api/surat-tugas/my/'.$letter->id.'/download?download=1', ['Accept' => 'application/octet-stream'])
            ->assertOk()->assertDownload();
        $this->assertSame(self::PDF, $binary->streamedContent());
    }

    private function fallback(AssignmentLetter $letter): void
    {
        foreach (['?preview=1', '', '?download=1'] as $suffix) {
            $response = $this->getJson('/api/surat-tugas/my/'.$letter->id.'/download'.$suffix)->assertOk()->assertDownload();
            $this->assertStringStartsWith('text/plain', $response->headers->get('Content-Type'));
            $this->assertStringContainsString($letter->maksud_tujuan, $response->getContent());
            $this->assertStringContainsString($letter->nomor_surat, $response->getContent());
        }
    }

    private function deniedRepresentations(AssignmentLetter $letter, int $detailStatus, int $downloadStatus): void
    {
        foreach (['', '?mobile=1'] as $suffix) {
            $this->getJson('/api/surat-tugas/my/'.$letter->id.$suffix)->assertStatus($detailStatus);
        }
        foreach (['?preview=1', '', '?download=1'] as $suffix) {
            $response = $this->getJson('/api/surat-tugas/my/'.$letter->id.'/download'.$suffix)->assertStatus($downloadStatus);
            $this->assertStringNotContainsString('DUMMY_ST_ACTOR_PRIVATE_BYTES', $response->getContent());
            $this->assertStringNotContainsString($letter->maksud_tujuan, $response->getContent());
        }
    }
}
