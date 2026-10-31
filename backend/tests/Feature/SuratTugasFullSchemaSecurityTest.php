<?php

namespace Tests\Feature;

use App\Events\AdminInboxChanged;
use App\Events\PortalNotificationCreated;
use App\Jobs\ArchiveOfficialDocument;
use App\Models\DriveFile;
use App\Models\User;
use App\Modules\Kepegawaian\Models\Employee;
use App\Modules\Kepegawaian\Models\EmployeeLeaveRequest;
use App\Modules\SuratTugas\Models\AssignmentLetter;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Event;
use Illuminate\Support\Facades\Storage;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

/** Full schema and real archive job; no auth or module middleware is disabled. */
class SuratTugasFullSchemaSecurityTest extends TestCase
{
    protected function setUp(): void
    {
        parent::setUp();
        if (! app()->environment('testing') || config('database.default') !== 'sqlite'
            || config('database.connections.sqlite.database') !== ':memory:') {
            throw new \LogicException('This fixture requires a disposable SQLite memory database.');
        }
        // Fresh schema without an enclosing transaction: these tests exercise
        // real commit callbacks. The memory database disappears with the app.
        $this->artisan('migrate:fresh', ['--force' => true]);
        config(['auth.two_factor_enforce' => false, 'queue.default' => 'sync', 'filesystems.default' => 'local']);
        Storage::fake('local');
        Storage::fake('public');
        Storage::fake('drive');
        Event::fake([AdminInboxChanged::class, PortalNotificationCreated::class]);
    }

    private function actor(string $role = 'user', array $modules = [], array $permissions = []): array
    {
        static $sequence = 0;
        $nip = '90000000000000'.str_pad((string) ++$sequence, 4, '0', STR_PAD_LEFT);
        $employee = Employee::create(['nip' => $nip, 'nama_lengkap' => 'Dummy Person '.$sequence, 'is_active' => true]);
        $user = User::factory()->create([
            'name' => 'Dummy '.$nip, 'username' => $nip, 'email' => $nip.'@example.test',
            'password' => 'DummyPassword123!', 'must_change_password' => false,
            'role' => $role, 'access_modules' => $modules, 'permissions' => $permissions, 'is_active' => true,
        ]);
        return [$user, $employee];
    }

    private function submit(Employee $employee, array $overrides = [])
    {
        return $this->post('/api/surat-tugas/submit', array_merge([
            'maksud_tujuan' => 'Dummy legitimate assignment', 'tanggal_mulai' => '2026-11-20',
            'tanggal_selesai' => '2026-11-21', 'sumber_dana' => 'dipa',
            'employees' => [['id' => $employee->id]],
            'file_surat' => UploadedFile::fake()->createWithContent('basis.pdf', "%PDF-1.4\nDUMMY_OFFICIAL_BYTES\n%%EOF"),
        ], $overrides), ['Accept' => 'application/json']);
    }

    public function test_real_archive_runs_after_commit_and_retries_idempotently(): void
    {
        [, $employee] = $this->actor();
        DriveFile::creating(function ($file) {
            if ($file->source_module === 'surat_tugas') {
                $this->assertSame(0, DB::transactionLevel(), 'Archive metadata must not precede commit.');
            }
        });
        $response = $this->submit($employee)->assertCreated();
        $letter = AssignmentLetter::findOrFail($response->json('data.id'));
        $archive = DriveFile::where('source_module', 'surat_tugas')->where('source_id', $letter->id)->sole();
        $this->assertSame(Storage::disk('local')->get($letter->file_surat_path), Storage::disk('drive')->get($archive->s3_key));
        $job = new ArchiveOfficialDocument('surat_tugas', $letter->id, 'local', $letter->file_surat_path);
        $job->handle();
        $job->handle();
        $this->assertSame(1, DriveFile::where('source_id', $letter->id)->count());
        $this->assertCount(1, Storage::disk('drive')->allFiles());
        $this->assertNull($archive->user_id);
        [$stranger] = $this->actor();
        Sanctum::actingAs($stranger);
        $this->getJson('/api/drive/files/'.$archive->id.'/url')->assertForbidden();
        $archive->delete();
        $job->handle();
        $this->assertSame(1, DriveFile::withTrashed()->where('source_id', $letter->id)->count());
        $this->assertTrue($archive->fresh()->trashed());
    }

    public function test_archive_write_failure_keeps_committed_document_and_can_be_retried(): void
    {
        [, $employee] = $this->actor();
        $disk = Storage::disk('drive');
        $failing = \Mockery::mock($disk);
        $failing->shouldReceive('writeStream')->once()->andReturn(false);
        Storage::set('drive', $failing);
        $response = $this->submit($employee)->assertCreated();
        $letter = AssignmentLetter::findOrFail($response->json('data.id'));
        Storage::disk('local')->assertExists($letter->file_surat_path);
        $this->assertSame(0, DriveFile::where('source_id', $letter->id)->count());
        Storage::set('drive', $disk);
        $job = new ArchiveOfficialDocument('surat_tugas', $letter->id, 'local', $letter->file_surat_path);
        $job->handle();
        $job->handle();
        $archive = DriveFile::where('source_id', $letter->id)->sole();
        $this->assertSame(Storage::disk('local')->get($letter->file_surat_path), $disk->get($archive->s3_key));
    }

    public function test_enclosing_rollback_does_not_publish_an_archive(): void
    {
        [, $employee] = $this->actor();
        DB::beginTransaction();
        $response = $this->submit($employee)->assertCreated();
        $id = $response->json('data.id');
        $path = AssignmentLetter::findOrFail($id)->file_surat_path;
        $this->assertSame(0, DriveFile::where('source_id', $id)->count());
        DB::rollBack();
        $this->assertNull(AssignmentLetter::find($id));
        $this->assertSame(0, DriveFile::where('source_id', $id)->count());
        $this->assertCount(0, Storage::disk('drive')->allFiles());
        Storage::disk('local')->assertMissing($path);
    }

    public function test_upload_and_download_use_local_disk_even_when_default_is_public(): void
    {
        [$owner, $employee] = $this->actor();
        Sanctum::actingAs($owner);
        config(['filesystems.default' => 'public']);
        $response = $this->submit($employee)->assertCreated();
        $letter = AssignmentLetter::findOrFail($response->json('data.id'));
        Storage::disk('local')->assertExists($letter->file_surat_path);
        Storage::disk('public')->assertMissing($letter->file_surat_path);
        $preview = $this->getJson('/api/surat-tugas/my/'.$letter->id.'/download?preview=1')->assertOk();
        $this->assertSame(
            Storage::disk('local')->get($letter->file_surat_path),
            base64_decode(explode(',', $preview->json('data_url'), 2)[1], true)
        );
        $this->get('/api/surat-tugas/my/'.$letter->id.'/download?download=1')->assertOk()->assertDownload();
    }

    public function test_real_iam_withdrawal_revokes_token_and_relogin_cannot_reopen_details(): void
    {
        [$super] = $this->actor('super_admin');
        [$admin, $employee] = $this->actor('admin', ['surat_tugas'], ['surat_tugas.approve']);
        [, $other] = $this->actor();
        $marker = 'DUMMY_PRIVATE_IAM_LEAVE_REASON';
        EmployeeLeaveRequest::create([
            'employee_id' => $other->id, 'jenis_cuti' => 'Cuti Sakit', 'alasan_cuti' => $marker,
            'tanggal_pengajuan' => '2026-11-01', 'tanggal_mulai' => '2026-11-20',
            'tanggal_selesai' => '2026-11-25', 'jumlah_hari' => 6, 'status' => 'approved',
            'alamat_menjalankan_cuti' => 'Dummy address',
        ]);
        $oldToken = $admin->createToken('dummy-old')->plainTextToken;
        Sanctum::actingAs($super);
        $this->putJson('/api/kepegawaian/employees/'.$employee->id.'/access', [
            'role' => 'admin', 'access_modules' => ['keuangan'], 'permissions' => ['surat_tugas.approve'],
        ])->assertOk();
        $this->assertSame(0, $admin->tokens()->count());
        $this->app['auth']->forgetGuards();
        $this->withToken($oldToken)->getJson('/api/surat-tugas')->assertUnauthorized();
        $this->flushHeaders();
        $this->app['auth']->forgetGuards();
        $login = $this->postJson('/api/login', ['username' => $admin->username, 'password' => 'DummyPassword123!'])->assertOk();
        $token = $login->json('token');
        $this->assertNotEmpty($token);
        // Discard the test login's web guard so this next path exercises real bearer auth.
        $this->app['auth']->forgetGuards();
        $this->withToken($token)->getJson('/api/surat-tugas')->assertForbidden();
        $this->app['auth']->forgetGuards();
        $payload = ['employees' => [$other->id], 'tanggal_mulai' => '2026-11-22', 'tanggal_selesai' => '2026-11-23'];
        $response = $this->withToken($token)->postJson('/api/surat-tugas/check-conflicts', $payload)->assertOk();
        $response->assertJsonPath('conflicts.0.keterangan', 'Cuti Aktif');
        $this->assertStringNotContainsString($marker, $response->getContent());
    }

    public function test_qr_status_aliases_and_deleted_restored_document_projection(): void
    {
        [$creator, $employee] = $this->actor();
        $letter = AssignmentLetter::create([
            'maksud_tujuan' => 'Dummy published assignment', 'nomor_surat' => 'ST/DUMMY/QR',
            'tanggal_mulai' => '2026-11-20', 'tanggal_selesai' => '2026-11-21',
            'created_by' => $creator->id, 'status' => 'pending',
        ]);
        $letter->employees()->attach($employee->id);
        foreach (['approved', 'completed', 'published', 'diterbitkan', 'APPROVED'] as $status) {
            $letter->update(['status' => $status]);
            $response = $this->getJson('/api/surat-tugas/verify/st-'.$letter->id)->assertOk();
            $this->assertSame(
                ['nomor_surat', 'maksud_tujuan', 'tanggal_berlaku', 'tempat_tujuan', 'personil'],
                array_keys($response->json('data'))
            );
            $this->assertStringNotContainsString($employee->nip, $response->getContent());
        }
        $letter->delete();
        $this->getJson('/api/surat-tugas/verify/'.$letter->id)->assertNotFound();
        $letter->restore();
        $this->getJson('/api/surat-tugas/verify/'.$letter->id)->assertOk();
        foreach (['draft', 'pending', 'rejected'] as $status) {
            $letter->update(['status' => $status]);
            $this->getJson('/api/surat-tugas/verify/'.$letter->id)->assertForbidden();
        }
    }

    public function test_database_queue_executes_the_real_archive_job(): void
    {
        config(['queue.default' => 'database']);
        [, $employee] = $this->actor();
        $response = $this->submit($employee)->assertCreated();
        $id = $response->json('data.id');
        $this->assertSame(1, DB::table('jobs')->count());
        $this->assertSame(0, DriveFile::where('source_id', $id)->count());
        $disk = Storage::disk('drive');
        $failing = \Mockery::mock($disk);
        $failing->shouldReceive('writeStream')->once()->andReturn(false);
        Storage::set('drive', $failing);
        $this->artisan('queue:work', [
            'connection' => 'database', '--once' => true, '--stop-when-empty' => true,
            '--sleep' => 0, '--tries' => 3, '--timeout' => 10,
        ])->assertExitCode(0);
        $this->assertSame(1, DB::table('jobs')->count());
        $this->assertSame(1, (int) DB::table('jobs')->value('attempts'));
        $this->assertSame(0, DriveFile::where('source_id', $id)->count());
        Storage::set('drive', $disk);
        $this->travel(11)->seconds();
        $this->artisan('queue:work', [
            'connection' => 'database', '--once' => true, '--stop-when-empty' => true,
            '--sleep' => 0, '--tries' => 3, '--timeout' => 10,
        ])->assertExitCode(0);
        $this->travelBack();
        $this->assertSame(0, DB::table('jobs')->count());
        $archive = DriveFile::where('source_id', $id)->sole();
        $letter = AssignmentLetter::findOrFail($id);
        $this->assertSame(Storage::disk('local')->get($letter->file_surat_path), Storage::disk('drive')->get($archive->s3_key));
    }

    public function test_system_archive_migration_preserves_data_on_unsafe_rollback(): void
    {
        [, $employee] = $this->actor();
        $response = $this->submit($employee)->assertCreated();
        $archive = DriveFile::where('source_id', $response->json('data.id'))->sole();
        $migration = require database_path('migrations/2026_10_31_180000_allow_system_owned_drive_archives.php');
        try {
            $migration->down();
            $this->fail('Rollback must refuse to discard ownerless archives.');
        } catch (\RuntimeException $e) {
            $this->assertStringContainsString('Assign owners', $e->getMessage());
        }
        $this->assertNull($archive->fresh()->user_id);
        Storage::disk('drive')->assertExists($archive->s3_key);
        [$owner] = $this->actor();
        $archive->update(['user_id' => $owner->id]);
        $migration->down();
        $migration->up();
        $this->assertSame($owner->id, $archive->fresh()->user_id);
        $this->assertTrue(collect(DB::select('PRAGMA foreign_key_list(drive_files)'))
            ->contains(fn ($key) => $key->from === 'user_id' && $key->table === 'users' && $key->on_delete === 'CASCADE'));
    }

    public function test_slug_collision_does_not_share_files_or_reserve_document_numbers(): void
    {
        [$admin, $first] = $this->actor('admin', ['surat_tugas']);
        [, $second] = $this->actor();
        $this->assertSame(\Illuminate\Support\Str::slug('ST/A'), \Illuminate\Support\Str::slug('STA'));
        $one = $this->submit($first, ['nomor_surat' => 'ST/A'])->assertCreated();
        $one = AssignmentLetter::findOrFail($one->json('data.id'));
        $oldBytes = Storage::disk('local')->get($one->file_surat_path);
        $two = $this->submit($second, [
            'nomor_surat' => 'STA',
            'file_surat' => UploadedFile::fake()->createWithContent('second.pdf', "%PDF-1.4\nDUMMY_SECOND_FILE\n%%EOF"),
        ])->assertCreated();
        $two = AssignmentLetter::findOrFail($two->json('data.id'));
        $this->assertNotSame($one->file_surat_path, $two->file_surat_path);
        $this->assertSame($oldBytes, Storage::disk('local')->get($one->file_surat_path));
        $this->assertNotSame($oldBytes, Storage::disk('local')->get($two->file_surat_path));
        Sanctum::actingAs($admin);
        $a = $this->getJson('/api/surat-tugas/utils/next-number')->assertOk()->json('next_number');
        $b = $this->getJson('/api/surat-tugas/utils/next-number')->assertOk()->json('next_number');
        $this->assertSame($a, $b, 'A suggestion is not a reserved number.');
    }

    public function test_public_conflict_detail_role_module_permission_matrix_and_expired_token(): void
    {
        [, $employee] = $this->actor();
        $marker = 'DUMMY_PRIVATE_MATRIX_REASON';
        EmployeeLeaveRequest::create([
            'employee_id' => $employee->id, 'jenis_cuti' => 'Cuti Sakit', 'alasan_cuti' => $marker,
            'tanggal_pengajuan' => '2026-11-01', 'tanggal_mulai' => '2026-11-20',
            'tanggal_selesai' => '2026-11-25', 'jumlah_hari' => 6, 'status' => 'approved',
            'alamat_menjalankan_cuti' => 'Dummy address',
        ]);
        $payload = ['employees' => [$employee->id], 'tanggal_mulai' => '2026-11-22', 'tanggal_selesai' => '2026-11-23'];
        $this->postJson('/api/surat-tugas/check-conflicts', $payload)->assertOk()->assertJsonPath('conflicts.0.keterangan', 'Cuti Aktif');
        foreach ([
            ['user', [], null, false],
            ['user', ['surat_tugas'], [], false],
            ['user', ['surat_tugas'], ['surat_tugas.approve'], true],
            ['admin', ['surat_tugas'], null, true],
            ['admin', ['kepegawaian'], [], true],
            ['admin', ['surat_tugas'], ['surat_tugas.view'], true],
            ['admin', ['keuangan'], ['surat_tugas.approve'], false],
            ['admin', [], [], false],
            ['super_admin', [], [], true],
        ] as [$role, $modules, $permissions, $details]) {
            [$user] = $this->actor($role, $modules, $permissions ?? []);
            $user->update(['permissions' => $permissions]);
            $token = $user->createToken('dummy-matrix')->plainTextToken;
            $this->app['auth']->forgetGuards();
            $response = $this->withToken($token)->postJson('/api/surat-tugas/check-conflicts', $payload)->assertOk();
            $response->assertJsonPath('conflicts.0.keterangan', $details ? $marker : 'Cuti Aktif');
        }
        [$expired] = $this->actor('admin', ['surat_tugas']);
        $token = $expired->createToken('dummy-expired', ['*'], now()->subMinute())->plainTextToken;
        $this->app['auth']->forgetGuards();
        $response = $this->withToken($token)->postJson('/api/surat-tugas/check-conflicts', $payload)->assertOk();
        $this->assertStringNotContainsString($marker, $response->getContent());
        $this->withToken($token)->getJson('/api/surat-tugas')->assertUnauthorized();
    }
}
