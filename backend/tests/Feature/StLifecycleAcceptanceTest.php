<?php

namespace Tests\Feature;

use App\Events\AdminInboxChanged;
use App\Events\PortalNotificationCreated;
use App\Models\User;
use App\Modules\Kepegawaian\Models\Employee;
use App\Modules\SuratTugas\Models\AssignmentLetter;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Bus;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Event;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;
use Laravel\Sanctum\Sanctum;
use PHPUnit\Framework\Attributes\DataProvider;
use Tests\TestCase;

/** Native Laravel request acceptance; all bytes are tiny dummy fixtures. */
class StLifecycleAcceptanceTest extends TestCase
{
    private array $uploadHandles = [];
    private const PDF = "%PDF-1.4\nDUMMY_ACCEPTANCE_BYTES\n%%EOF";

    protected function setUp(): void
    {
        parent::setUp();
        if (! app()->environment('testing') || config('database.default') !== 'sqlite'
            || config('database.connections.sqlite.database') !== ':memory:') {
            throw new \LogicException('Disposable SQLite memory database required.');
        }
        $this->artisan('migrate:fresh', ['--force' => true]);
        config(['auth.two_factor_enforce' => false, 'filesystems.default' => 'local']);
        Storage::fake('local');
        Bus::fake();
        Event::fake([AdminInboxChanged::class, PortalNotificationCreated::class]);
    }

    private function actor(string $role = 'user'): array
    {
        static $sequence = 0;
        $nip = '91000000000000'.str_pad((string) ++$sequence, 4, '0', STR_PAD_LEFT);
        $employee = Employee::create(['nip' => $nip, 'nama_lengkap' => 'Dummy '.$nip, 'is_active' => true]);
        $user = User::factory()->create([
            'username' => $nip, 'email' => $nip.'@example.test', 'role' => $role,
            'access_modules' => ['surat_tugas'], 'permissions' => [], 'is_active' => true,
            'must_change_password' => false,
        ]);
        return [$user, $employee];
    }

    private function letter(User $owner, Employee $employee, string $status = 'pending', int $day = 1, bool $trashed = false): AssignmentLetter
    {
        $letter = AssignmentLetter::create([
            'nomor_surat' => 'ST/DUMMY/'.Str::uuid(), 'maksud_tujuan' => 'Dummy acceptance assignment',
            'tanggal_mulai' => sprintf('2026-12-%02d', $day), 'tanggal_selesai' => sprintf('2026-12-%02d', $day),
            'sumber_dana' => 'dipa', 'status' => $status, 'created_by' => $owner->id,
        ]);
        $letter->employees()->attach($employee->id);
        $path = 'surat-tugas/'.$letter->id.'/original.pdf';
        Storage::disk('local')->put($path, self::PDF.' '.$letter->id);
        $letter->update(['file_surat_path' => $path]);
        if ($trashed) $letter->delete();
        return $letter;
    }

    private function upload(string $name, string $bytes, bool $reportedOversize = false): UploadedFile
    {
        $handle = tmpfile();
        fwrite($handle, $bytes);
        $this->uploadHandles[] = $handle;
        $path = stream_get_meta_data($handle)['uri'];
        // Only native validation metadata is oversized, never the bytes or an HTTP-server transport.
        return $reportedOversize
            ? new class($path, $name, 'application/pdf', UPLOAD_ERR_OK, true) extends UploadedFile {
                public function getSize(): int { return 10240 * 1024 + 1; }
            }
            : new UploadedFile($path, $name, 'application/pdf', UPLOAD_ERR_OK, true);
    }

    private function state(): array
    {
        $files = [];
        foreach (Storage::disk('local')->allFiles() as $path) $files[$path] = Storage::disk('local')->get($path);
        ksort($files);
        return [
            DB::table('st_assignment_letters')->orderBy('id')->get()->map(fn ($row) => (array) $row)->all(),
            DB::table('st_assignment_letter_employees')->orderBy('id')->get()->map(fn ($row) => (array) $row)->all(),
            $files,
        ];
    }

    public static function uploadDoors(): array
    {
        return [['public'], ['store'], ['update']];
    }

    #[DataProvider('uploadDoors')]
    public function test_valid_and_rejected_uploads_preserve_exact_rows_and_bytes(string $door): void
    {
        [$owner, $employee] = $this->actor();
        [$foreign, $foreignEmployee] = $this->actor();
        $protected = $this->letter($foreign, $foreignEmployee, 'approved', 20);
        $target = $door === 'update' ? $this->letter($owner, $employee) : null;
        if ($door !== 'public') Sanctum::actingAs($owner);
        $url = $door === 'public' ? '/api/surat-tugas/submit' : '/api/surat-tugas'.($target ? '/'.$target->id : '');
        $payload = [
            'maksud_tujuan' => 'Dummy valid upload assignment', 'tanggal_mulai' => '2026-12-01',
            'tanggal_selesai' => '2026-12-01', 'sumber_dana' => 'dipa',
            'employees' => [['id' => $employee->id]],
        ];
        if ($target) $payload['_method'] = 'PUT';
        $valid = $this->upload('basis.pdf', self::PDF);
        $this->assertSame('application/pdf', $valid->getMimeType());
        $oldPath = $target?->file_surat_path;
        $response = $this->post($url, $payload + ['file_surat' => $valid], ['Accept' => 'application/json']);
        $response->assertStatus($target ? 200 : 201);
        $saved = AssignmentLetter::findOrFail($response->json('data.id'));
        $this->assertStringStartsWith('surat-tugas/'.$saved->id.'/', $saved->file_surat_path);
        $this->assertSame(self::PDF, Storage::disk('local')->get($saved->file_surat_path));
        if ($oldPath) Storage::disk('local')->assertMissing($oldPath);
        $this->assertSame(self::PDF.' '.$protected->id, Storage::disk('local')->get($protected->fresh()->file_surat_path));
        $before = $this->state();
        foreach (['actual-mime', 'visible-extension', 'reported-size'] as $case) {
            $upload = match ($case) {
                'actual-mime' => $this->upload('basis.pdf', 'DUMMY plain text is not a PDF'),
                'visible-extension' => $this->upload('basis.txt', self::PDF),
                'reported-size' => $this->upload('basis.pdf', self::PDF, true),
            };
            $this->assertSame($case === 'actual-mime' ? 'text/plain' : 'application/pdf', $upload->getMimeType());
            $this->assertLessThan(128, filesize($upload->getPathname()), 'Actual fixture bytes stay bounded.');
            $invalid = $this->post($url, $payload + ['file_surat' => $upload], ['Accept' => 'application/json']);
            $invalid->assertUnprocessable()->assertJsonValidationErrors(['file_surat']);
            $this->assertSame(['file_surat'], array_keys($invalid->json('errors')), $door.' '.$case);
            $this->assertSame($before, $this->state(), $door.' '.$case.' must preserve every letter, pivot and file byte.');
        }
    }

    public function test_mixed_bulk_trash_restore_and_existing_creator_official_restore_policy(): void
    {
        [$owner, $employee] = $this->actor();
        [$foreign, $foreignEmployee] = $this->actor();
        [$admin] = $this->actor('admin');
        $owned = $this->letter($owner, $employee, 'pending', 1);
        $draft = $this->letter($owner, $employee, 'draft', 2);
        $official = $this->letter($owner, $employee, 'approved', 3);
        $other = $this->letter($foreign, $foreignEmployee, 'pending', 4);
        $oldTrash = $this->letter($owner, $employee, 'draft', 5, true);
        $foreignTrash = $this->letter($foreign, $foreignEmployee, 'draft', 6, true);
        $rows = [$owned, $draft, $official, $other, $oldTrash, $foreignTrash];
        $ids = array_map(fn ($row) => 'st-'.$row->id, $rows);
        $ids[] = (string) Str::uuid();
        $files = $this->state()[2];
        Sanctum::actingAs($owner);
        $this->postJson('/api/surat-tugas/bulk-trash', ['ids' => $ids])->assertOk()->assertJsonPath('message', '2 dokumen dipindahkan ke Arsip Sampah.');
        $this->assertDeletedMap($rows, [true, true, false, false, true, true]);
        $this->assertSame($files, $this->state()[2]);
        $this->postJson('/api/surat-tugas/bulk-restore', ['ids' => $ids])->assertOk()->assertJsonPath('message', '3 dokumen berhasil dipulihkan.');
        $this->assertDeletedMap($rows, [false, false, false, false, false, true]);
        $this->postJson('/api/surat-tugas/'.$foreignTrash->id.'/restore')->assertForbidden();
        $this->deleteJson('/api/surat-tugas/'.$official->id)->assertForbidden();
        // Admin can archive official letters; current policy permits the creator to restore them.
        Sanctum::actingAs($admin);
        $this->deleteJson('/api/surat-tugas/'.$official->id)->assertOk();
        Sanctum::actingAs($owner);
        $this->postJson('/api/surat-tugas/'.$official->id.'/restore')->assertOk();
        $this->assertDeletedMap($rows, [false, false, false, false, false, true]);
        $this->assertSame($files, $this->state()[2]);
        $before = $this->state();
        $this->postJson('/api/surat-tugas/bulk-force-delete', ['ids' => $ids])->assertForbidden();
        $this->assertSame($before, $this->state());
        Sanctum::actingAs($admin);
        $this->postJson('/api/surat-tugas/bulk-trash', ['ids' => $ids])->assertOk()->assertJsonPath('message', '5 dokumen dipindahkan ke Arsip Sampah.');
        $this->assertDeletedMap($rows, [true, true, true, true, true, true]);
        $this->postJson('/api/surat-tugas/bulk-restore', ['ids' => $ids])->assertOk()->assertJsonPath('message', '6 dokumen berhasil dipulihkan.');
        $this->assertDeletedMap($rows, [false, false, false, false, false, false]);
        $this->assertSame($files, $this->state()[2]);
    }

    private function assertDeletedMap(array $rows, array $deleted): void
    {
        $this->assertSame(count($rows), AssignmentLetter::withTrashed()->count());
        foreach ($rows as $index => $row) {
            $fresh = AssignmentLetter::withTrashed()->findOrFail($row->id);
            $this->assertSame($deleted[$index], $fresh->trashed(), $row->id);
            $this->assertSame($row->created_by, $fresh->created_by);
            $this->assertSame($row->status, $fresh->status);
            $this->assertSame($row->file_surat_path, $fresh->file_surat_path);
        }
    }

    public function test_restore_conflicts_reject_single_and_roll_back_whole_mixed_batch(): void
    {
        [$owner, $employee] = $this->actor();
        [$foreign, $otherEmployee] = $this->actor();
        $active = $this->letter($foreign, $employee, 'pending', 10);
        $safe = $this->letter($owner, $employee, 'pending', 11, true);
        $conflicting = $this->letter($owner, $employee, 'pending', 10, true);
        $this->assertLessThan($conflicting->id, $safe->id, 'Fixture must sort the safe row before the conflict.');
        $foreignTrash = $this->letter($foreign, $otherEmployee, 'draft', 12, true);
        Sanctum::actingAs($owner);
        $before = $this->state();
        $this->postJson('/api/surat-tugas/'.$conflicting->id.'/restore')->assertUnprocessable()->assertJsonValidationErrors(['employees']);
        $this->assertSame($before, $this->state());
        $intermediate = [];
        Event::listen('eloquent.restored: '.AssignmentLetter::class, function (AssignmentLetter $restored) use ($safe, &$intermediate) {
            if ($restored->id === $safe->id) {
                $intermediate[] = ['id' => $safe->id, 'active_in_transaction' => !AssignmentLetter::withTrashed()->findOrFail($safe->id)->trashed(),
                    'transaction_level' => DB::transactionLevel()];
            }
        });
        $this->postJson('/api/surat-tugas/bulk-restore', ['ids' => [$safe->id, $conflicting->id, $foreignTrash->id, (string) Str::uuid()]])
            ->assertUnprocessable()->assertJsonValidationErrors(['employees']);
        $this->assertSame($before, $this->state(), 'A rejected batch must not partially restore safe rows.');
        // Observe intermediate writes without requiring a particular future prevalidation strategy.
        fwrite(STDOUT, json_encode(['check' => 'restore-rollback-observation', 'intermediate' => $intermediate,
            'safe_trashed_after_failure' => $safe->fresh()->trashed(), 'exact_batch_snapshot_preserved' => true], JSON_THROW_ON_ERROR).PHP_EOL);
        $active->delete();
        $this->postJson('/api/surat-tugas/bulk-restore', ['ids' => [$safe->id, $conflicting->id, $foreignTrash->id, (string) Str::uuid()]])
            ->assertOk()->assertJsonPath('message', '2 dokumen berhasil dipulihkan.');
        $this->assertFalse($conflicting->fresh()->trashed());
        $this->assertFalse($safe->fresh()->trashed());
        $this->assertTrue($foreignTrash->fresh()->trashed());
        $this->assertSame($before[2], $this->state()[2]);
    }

    public function test_admin_mixed_force_delete_removes_only_trash_and_keeps_shared_references(): void
    {
        [$admin, $employee] = $this->actor('admin');
        [$foreign, $otherEmployee] = $this->actor();
        $active = $this->letter($foreign, $otherEmployee, 'pending', 1);
        $ownedTrash = $this->letter($admin, $employee, 'draft', 2, true);
        $foreignTrash = $this->letter($foreign, $otherEmployee, 'draft', 3, true);
        $unshared = $ownedTrash->file_surat_path;
        $oldForeignPath = $foreignTrash->file_surat_path;
        $foreignTrash->update(['file_surat_path' => $active->file_surat_path]);
        Storage::disk('local')->delete($oldForeignPath);
        $protected = Storage::disk('local')->get($active->file_surat_path);
        Sanctum::actingAs($admin);
        $this->postJson('/api/surat-tugas/bulk-force-delete', ['ids' => [$active->id, $ownedTrash->id, $foreignTrash->id, (string) Str::uuid()]])
            ->assertOk()->assertJsonPath('message', '2 dokumen berhasil dihapus permanen dari arsip.');
        $this->assertSame([$active->id], AssignmentLetter::withTrashed()->pluck('id')->all());
        $this->assertSame(1, DB::table('st_assignment_letter_employees')->count());
        Storage::disk('local')->assertMissing($unshared);
        $this->assertSame([$active->file_surat_path => $protected], $this->state()[2]);
    }
}
