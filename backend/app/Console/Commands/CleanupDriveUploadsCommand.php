<?php

namespace App\Console\Commands;

use App\Models\DriveUpload;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Storage;

class CleanupDriveUploadsCommand extends Command
{
    /**
     * The name and signature of the console command.
     */
    protected $signature = 'drive:cleanup-uploads';

    /**
     * The console command description.
     */
    protected $description = 'Bersihkan sesi upload BKSDA Drive yang kedaluwarsa atau ditinggal (Fase 2.7)';

    /**
     * Execute the console command.
     */
    public function handle(): int
    {
        $expiredUploads = DriveUpload::where('status', 'initiated')
            ->where('expires_at', '<', now())
            ->get();

        $count = $expiredUploads->count();
        $this->info("Menemukan {$count} sesi upload kedaluwarsa.");

        if ($count === 0) {
            return Command::SUCCESS;
        }

        $s3Client = null;
        try {
            $s3Client = Storage::disk('drive')->getClient();
        } catch (\Throwable $e) {
            // Jika drive disk bukan S3 atau mock, client mungkin tidak tersedia
        }

        $aborted = 0;
        foreach ($expiredUploads as $upload) {
            try {
                // 1. Abort S3 Multipart Upload jika ada upload_id
                if ($upload->upload_id && $s3Client) {
                    try {
                        $s3Client->abortMultipartUpload([
                            'Bucket' => config('filesystems.disks.drive.bucket', 'bksda-drive'),
                            'Key' => $upload->s3_key,
                            'UploadId' => $upload->upload_id,
                        ]);
                    } catch (\Throwable $e) {
                        Log::debug("S3 AbortMultipartUpload failed or not found: {$e->getMessage()}");
                    }
                }

                // 2. Hapus file parsial jika ada di disk
                try {
                    if (Storage::disk('drive')->exists($upload->s3_key)) {
                        Storage::disk('drive')->delete($upload->s3_key);
                    }
                } catch (\Throwable $e) {
                    // Abaikan
                }

                // 3. Update status jadi aborted
                $upload->update(['status' => 'aborted']);
                $aborted++;
            } catch (\Throwable $e) {
                Log::warning("Gagal membersihkan upload Drive #{$upload->id}: {$e->getMessage()}");
            }
        }

        $this->info("Berhasil membatalkan dan membersihkan {$aborted} sesi upload kedaluwarsa.");
        return Command::SUCCESS;
    }
}
