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

    public function __construct(
        string $sourceModule,
        string|int $sourceId,
        string $sourceDisk,
        string $sourcePath,
        ?string $targetName = null,
        ?int $unitId = null,
        ?int $userId = null
    ) {
        $this->sourceModule = $sourceModule;
        $this->sourceId = (string) $sourceId;
        $this->sourceDisk = $sourceDisk;
        $this->sourcePath = $sourcePath;
        $this->targetName = $targetName;
        $this->unitId = $unitId;
        $this->userId = $userId;
    }

    public function handle(): void
    {
        // 1. Idempotency check: Already archived?
        $existing = DriveFile::withTrashed()->where('source_module', $this->sourceModule)
            ->where('source_id', $this->sourceId)
            ->first();

        if ($existing) {
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

        // 5. Create DriveFile record
        DriveFile::withTrashed()->firstOrCreate(
            [
                'source_module' => $this->sourceModule,
                'source_id' => $this->sourceId,
            ],
            [
                'unit_id' => $this->unitId,
                'user_id' => $this->userId,
                'name' => $cleanFilename,
                's3_key' => $targetKey,
                'size_bytes' => $sizeBytes,
                'mime_type' => $mimeType,
            ]
        );

        Log::info("AutoArchive: Successfully archived {$this->sourceModule} #{$this->sourceId} to {$targetKey}.");
    }

    public function failed(\Throwable $exception): void
    {
        Log::error("AutoArchive failed permanently for {$this->sourceModule} #{$this->sourceId}: {$exception->getMessage()}");
    }
}
