<?php

namespace Tests\Feature;

use App\Jobs\ArchiveOfficialDocument;
use App\Models\DriveFile;
use App\Models\User;
use App\Modules\SuratTugas\Models\AssignmentLetter;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Storage;
use Tests\TestCase;

class AutoArchiveTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        Storage::fake('local');
        Storage::fake('drive');
    }

    public function test_auto_archive_job_copies_stream_and_creates_drive_file(): void
    {
        $user = User::factory()->create([
            'name' => 'Archive Admin',
            'username' => 'archive.admin',
            'email' => 'archive@bksdakaltim.web.id',
            'role' => 'admin',
        ]);

        // 1. Put mock file on local disk
        $localPath = 'surat-tugas/2026-10/dasar-surat.pdf';
        $dummyContent = '%PDF-1.4 Mock Official Document Content for Antigravity Verification';
        Storage::disk('local')->put($localPath, $dummyContent);

        $this->assertTrue(Storage::disk('local')->exists($localPath));

        // 2. Dispatch Archive Job
        ArchiveOfficialDocument::dispatchSync(
            'surat_tugas',
            'ST-999',
            'local',
            $localPath,
            'ST-999-Resmi.pdf',
            null,
            $user->id
        );

        // 3. Assert DriveFile created
        $driveFile = DriveFile::where('source_module', 'surat_tugas')
            ->where('source_id', 'ST-999')
            ->first();

        $this->assertNotNull($driveFile);
        $this->assertEquals('ST-999-Resmi.pdf', $driveFile->name);
        $this->assertTrue(Storage::disk('drive')->exists($driveFile->s3_key));
        $this->assertEquals($dummyContent, Storage::disk('drive')->get($driveFile->s3_key));

        // 4. Assert Deleting original local file does not delete drive archive
        Storage::disk('local')->delete($localPath);
        $this->assertFalse(Storage::disk('local')->exists($localPath));
        $this->assertTrue(Storage::disk('drive')->exists($driveFile->s3_key));
    }

    public function test_auto_archive_is_strictly_idempotent(): void
    {
        $user = User::factory()->create([
            'name' => 'Idempotent User',
            'username' => 'user.idemp',
            'email' => 'idemp@bksdakaltim.web.id',
            'role' => 'user',
        ]);

        $localPath = 'cuti_scans/surat_izin/sk-cuti-100.pdf';
        Storage::disk('local')->put($localPath, 'PDF dummy cuti content');

        // Dispatch 1st time
        ArchiveOfficialDocument::dispatchSync(
            'cuti',
            'CUTI-100',
            'local',
            $localPath,
            'SK-Cuti-100.pdf',
            null,
            $user->id
        );

        $countAfterFirst = DriveFile::where('source_module', 'cuti')
            ->where('source_id', 'CUTI-100')
            ->count();
        $this->assertEquals(1, $countAfterFirst);

        // Dispatch 2nd time with same source_module and source_id
        ArchiveOfficialDocument::dispatchSync(
            'cuti',
            'CUTI-100',
            'local',
            $localPath,
            'SK-Cuti-100.pdf',
            null,
            $user->id
        );

        $countAfterSecond = DriveFile::where('source_module', 'cuti')
            ->where('source_id', 'CUTI-100')
            ->count();
        $this->assertEquals(1, $countAfterSecond, 'Document processed twice must still result in exactly 1 record.');
    }

    public function test_backfill_artisan_command_processes_records(): void
    {
        $user = User::factory()->create([
            'name' => 'Backfill User',
            'username' => 'bf.user',
            'email' => 'bf@bksdakaltim.web.id',
            'role' => 'admin',
        ]);

        // Create assignment letter with local file
        $path = 'surat-tugas/2026/st-sample.pdf';
        Storage::disk('local')->put($path, 'Sample ST PDF');

        $letter = AssignmentLetter::create([
            'nomor_surat' => '123/BKSDA/2026',
            'maksud_tujuan' => 'Patroli Kawasan Konservasi',
            'tanggal_mulai' => now()->toDateString(),
            'tanggal_selesai' => now()->addDays(2)->toDateString(),
            'file_surat_path' => $path,
            'status' => 'approved',
            'created_by' => $user->id,
        ]);

        // Run backfill command
        $this->artisan('drive:backfill-archive', [
            '--module' => 'st',
            '--limit' => 10,
        ])->assertSuccessful();

        $this->assertDatabaseHas('drive_files', [
            'source_module' => 'surat_tugas',
            'source_id' => (string) $letter->id,
        ]);
    }
}
