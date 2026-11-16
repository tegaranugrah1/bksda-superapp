<?php

namespace App\Console\Commands;

use App\Models\DriveFile;
use App\Models\DriveFolder;
use App\Models\DriveShare;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Storage;

class PurgeDriveTrashCommand extends Command
{
    /**
     * The name and signature of the console command.
     */
    protected $signature = 'drive:purge-trash {--days=30 : Batas usia hari di sampah untuk dihapus permanen}';

    /**
     * The console command description.
     */
    protected $description = 'Hapus permanen berkas dan folder BKSDA Drive yang berada di sampah lebih dari 30 hari (Fase 2.7)';

    /**
     * Execute the console command.
     */
    public function handle(): int
    {
        $days = (int) $this->option('days');
        $cutoff = now()->subDays($days);

        $this->info("Membersihkan sampah Drive yang dihapus sebelum: {$cutoff->toDateTimeString()}");

        // 1. Berkas Drive
        $trashedFiles = DriveFile::onlyTrashed()
            ->where('deleted_at', '<=', $cutoff)
            ->get();

        $purgedFiles = 0;
        foreach ($trashedFiles as $file) {
            try {
                // Hapus objek fisik dari disk storage drive
                try {
                    if (Storage::disk('drive')->exists($file->s3_key)) {
                        Storage::disk('drive')->delete($file->s3_key);
                    }
                } catch (\Throwable $e) {
                    Log::warning("Gagal menghapus objek S3 {$file->s3_key}: {$e->getMessage()}");
                }

                $file->forceDelete();
                $purgedFiles++;
            } catch (\Throwable $e) {
                Log::warning("Gagal force delete DriveFile #{$file->id}: {$e->getMessage()}");
            }
        }

        // 2. Folder Drive
        $trashedFolders = DriveFolder::onlyTrashed()
            ->where('deleted_at', '<=', $cutoff)
            ->get();

        $purgedFolders = 0;
        // Purge folder lama beserta seluruh sub-tree & berkas turunannya secara atomik
        foreach ($trashedFolders as $folder) {
            try {
                DB::transaction(function () use ($folder) {
                    $allFolderIds = array_merge(
                        [$folder->id],
                        DriveFolder::collectDescendantIds($folder->id, withTrashed: true)
                    );
                    $childFiles = DriveFile::withTrashed()
                        ->whereIn('folder_id', $allFolderIds)
                        ->get();

                    foreach ($childFiles as $file) {
                        try {
                            if ($file->s3_key && Storage::disk('drive')->exists($file->s3_key)) {
                                Storage::disk('drive')->delete($file->s3_key);
                            }
                        } catch (\Throwable $e) {
                            Log::warning("Gagal menghapus objek S3 {$file->s3_key}: {$e->getMessage()}");
                        }
                        DriveShare::where('file_id', $file->id)->delete();
                        $file->forceDelete();
                    }

                    DriveShare::whereIn('folder_id', $allFolderIds)->delete();
                    foreach (array_reverse($allFolderIds) as $fid) {
                        DriveFolder::withTrashed()->where('id', $fid)->forceDelete();
                    }
                });
                $purgedFolders++;
            } catch (\Throwable $e) {
                Log::warning("Gagal force delete DriveFolder #{$folder->id}: {$e->getMessage()}");
            }
        }

        $this->info("Selesai: {$purgedFiles} berkas dan {$purgedFolders} folder dihapus permanen.");
        return Command::SUCCESS;
    }
}
