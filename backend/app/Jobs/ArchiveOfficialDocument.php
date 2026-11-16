<?php

namespace App\Jobs;

use App\Models\DriveFile;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Bus\Dispatchable;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Queue\SerializesModels;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Storage;

class ArchiveOfficialDocument implements ShouldQueue
{
    use Dispatchable, InteractsWithQueue, Queueable, SerializesModels;

    public int $tries = 3;
    public array $backoff = [10, 60, 300];

    public string $sourceModule;
    public string $sourceId;
    public string $sourceDisk;
    public string $sourcePath;
    public ?string $targetName;
    public ?int $unitId;
    public ?int $userId;
    public bool $replaceExisting;
    public string $action;

    public function __construct(
        string $sourceModule,
        string|int $sourceId,
        string $sourceDisk = 'local',
        string $sourcePath = '',
        ?string $targetName = null,
        ?int $unitId = null,
        ?int $userId = null,
        bool $replaceExisting = false,
        string $action = 'archive'
    ) {
        $this->sourceModule = $sourceModule;
        $this->sourceId = (string) $sourceId;
        $this->sourceDisk = $sourceDisk;
        $this->sourcePath = $sourcePath;
        $this->targetName = $targetName;
        $this->unitId = $unitId;
        $this->userId = $userId;
        $this->replaceExisting = $replaceExisting;
        $this->action = $action;
    }

    /**
     * Best-effort background archival: never blocks or fails the originating HTTP commit.
     */
    public static function dispatchBestEffort(
        string $sourceModule,
        string|int $sourceId,
        string $sourceDisk,
        string $sourcePath,
        ?string $targetName = null,
        ?int $unitId = null,
        ?int $userId = null,
        bool $replaceExisting = false
    ): void {
        $job = new static(
            $sourceModule,
            $sourceId,
            $sourceDisk,
            $sourcePath,
            $targetName,
            $unitId,
            $userId,
            $replaceExisting,
            'archive'
        );
        static::enqueueBestEffort($job, "AutoArchive ({$sourceModule} #{$sourceId})");
    }

    /**
     * Best-effort background purge of an archived DriveFile and its S3 object.
     */
    public static function deleteBestEffort(string $sourceModule, string|int $sourceId): void
    {
        $job = new static(
            $sourceModule,
            $sourceId,
            'local',
            '',
            null,
            null,
            null,
            false,
            'delete'
        );
        static::enqueueBestEffort($job, "AutoArchive delete ({$sourceModule} #{$sourceId})");
    }

    private static function enqueueBestEffort(self $job, string $label): void
    {
        try {
            if (config('queue.default') === 'sync' && ! app()->runningUnitTests()) {
                app()->terminating(static function () use ($job, $label): void {
                    $prevRetries = config('filesystems.disks.drive.retries');
                    $prevHttp = config('filesystems.disks.drive.http');
                    // ponytail: sync queue runs inside PHP request lifecycle (30s ceiling under php artisan serve);
                    // cap S3 stall when Drive/RustFS is unresponsive so HTTP sockets don't block; queued workers keep 60s.
                    config([
                        'filesystems.disks.drive.retries' => 0,
                        'filesystems.disks.drive.http' => ['connect_timeout' => 1.5, 'timeout' => 2],
                    ]);
                    Storage::forgetDisk('drive');
                    try {
                        $job->handle();
                    } catch (\Throwable $e) {
                        Log::warning("{$label} terminating skipped: {$e->getMessage()}");
                    } finally {
                        config([
                            'filesystems.disks.drive.retries' => $prevRetries,
                            'filesystems.disks.drive.http' => $prevHttp,
                        ]);
                        Storage::forgetDisk('drive');
                    }
                });
                return;
            }

            static::dispatch(
                $job->sourceModule,
                $job->sourceId,
                $job->sourceDisk,
                $job->sourcePath,
                $job->targetName,
                $job->unitId,
                $job->userId,
                $job->replaceExisting,
                $job->action
            );
        } catch (\Throwable $e) {
            Log::warning("{$label} dispatch skipped: {$e->getMessage()}");
        }
    }

    public function handle(): void
    {
        if (($this->action ?? 'archive') === 'delete') {
            $this->handleDelete();
            return;
        }

        if ($this->isStaleCutiArchive()) {
            Log::info("AutoArchive: Skipped stale archive for {$this->sourceModule} #{$this->sourceId}.");
            return;
        }

        // 1. Idempotency check: skip existing archive unless explicitly replacing.
        $existing = DriveFile::withTrashed()
            ->where('source_module', $this->sourceModule)
            ->where('source_id', $this->sourceId)
            ->first();

        if ($existing && ! ($this->replaceExisting ?? false)) {
            Log::info("AutoArchive: Document {$this->sourceModule} #{$this->sourceId} is already archived (DriveFile #{$existing->id}). Skipping.");
            return;
        }

        // 2. Validate source disk and file existence
        $srcDisk = Storage::disk($this->sourceDisk);
        if (!$srcDisk->exists($this->sourcePath)) {
            Log::warning("AutoArchive: Source file {$this->sourcePath} not found on disk {$this->sourceDisk}.");
            return;
        }

        $year = date('Y');
        $cleanModule = preg_replace('/[^a-zA-Z0-9_\-]/', '_', $this->sourceModule);
        $filename = $this->targetName ?: basename($this->sourcePath);
        $cleanFilename = preg_replace('/[\r\n"\/\\\\:*?<>|]/', '_', $filename);
        $targetKey = "system_archive/{$year}/{$cleanModule}/{$this->sourceId}_{$cleanFilename}";

        // 3. Stream copy across disks (memory efficient, handles files of any size)
        $sourceStream = $srcDisk->readStream($this->sourcePath);
        if (!$sourceStream) {
            throw new \RuntimeException("AutoArchive: Failed to open readStream from {$this->sourcePath} on disk {$this->sourceDisk}.");
        }

        $destDisk = Storage::disk('drive');
        $writeSuccess = $destDisk->writeStream($targetKey, $sourceStream);

        if (is_resource($sourceStream)) {
            fclose($sourceStream);
        }

        if (!$writeSuccess) {
            throw new \RuntimeException("AutoArchive: Failed to writeStream to {$targetKey} on disk drive.");
        }

        // Remove previous S3 object when replacing under a changed filename/key.
        if ($existing && $existing->s3_key && $existing->s3_key !== $targetKey) {
            try {
                if ($destDisk->exists($existing->s3_key)) {
                    $destDisk->delete($existing->s3_key);
                }
            } catch (\Throwable $e) {
                Log::warning("AutoArchive: Failed to delete replaced S3 key {$existing->s3_key}: {$e->getMessage()}");
            }
        }

        // 4. Retrieve stored metadata
        $sizeBytes = 0;
        try {
            $sizeBytes = $destDisk->size($targetKey);
        } catch (\Throwable $e) {
            // Some drivers might fail on immediate size
        }

        $mimeType = 'application/pdf';
        try {
            $mimeType = $destDisk->mimeType($targetKey) ?: 'application/pdf';
        } catch (\Throwable $e) {
            // Fallback
        }

        // 5. Create or update DriveFile record
        $attributes = [
            'unit_id' => $this->unitId,
            'user_id' => $this->userId,
            'name' => $cleanFilename,
            's3_key' => $targetKey,
            'size_bytes' => $sizeBytes,
            'mime_type' => $mimeType,
        ];

        if ($existing) {
            if ($existing->trashed()) {
                $existing->restore();
            }
            $existing->update($attributes);
        } else {
            DriveFile::create(array_merge([
                'source_module' => $this->sourceModule,
                'source_id' => $this->sourceId,
            ], $attributes));
        }

        Log::info("AutoArchive: Successfully archived {$this->sourceModule} #{$this->sourceId} to {$targetKey}.");
    }

    private function handleDelete(): void
    {
        $file = DriveFile::withTrashed()
            ->where('source_module', $this->sourceModule)
            ->where('source_id', $this->sourceId)
            ->first();

        if (! $file) {
            return;
        }

        // Skip stale delete if the cuti row currently points to an active non-deleted scan.
        if ($this->sourceModule === 'cuti' && ctype_digit($this->sourceId)) {
            $req = \App\Modules\Kepegawaian\Models\EmployeeLeaveRequest::withTrashed()->find((int) $this->sourceId);
            if ($req && ! $req->trashed() && ! empty($req->scan_surat_izin_path ?: $req->scan_surat_path)) {
                return;
            }
        }

        if ($file->s3_key) {
            $disk = Storage::disk('drive');
            if ($disk->exists($file->s3_key)) {
                $disk->delete($file->s3_key);
            }
        }

        $deletedKey = $file->s3_key;
        $file->forceDelete();

        Log::info("AutoArchive: Purged archive {$this->sourceModule} #{$this->sourceId} ({$deletedKey}).");
    }

    private function isStaleCutiArchive(): bool
    {
        if ($this->sourceModule !== 'cuti' || ! ctype_digit($this->sourceId)) {
            return false;
        }

        $req = \App\Modules\Kepegawaian\Models\EmployeeLeaveRequest::withTrashed()->find((int) $this->sourceId);
        if (! $req) {
            return false;
        }

        return $req->trashed() || ($req->scan_surat_izin_path ?: $req->scan_surat_path) !== $this->sourcePath;
    }

    public function failed(\Throwable $exception): void
    {
        Log::error("AutoArchive failed permanently for {$this->sourceModule} #{$this->sourceId}: {$exception->getMessage()}");
    }
}
