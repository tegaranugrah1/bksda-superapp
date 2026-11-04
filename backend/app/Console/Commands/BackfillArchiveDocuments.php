<?php

namespace App\Console\Commands;

use App\Jobs\ArchiveOfficialDocument;
use App\Models\DriveFile;
use App\Modules\Kepegawaian\Models\EmployeeLeave;
use App\Modules\SuratTugas\Models\AssignmentLetter;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\Storage;

class BackfillArchiveDocuments extends Command
{
    protected $signature = 'drive:backfill-archive 
                            {--module=all : Filter module (st, cuti, all)} 
                            {--limit=100 : Max records to process per module}';

    protected $description = 'Arsipkan dokumen resmi lama (Surat Tugas, Cuti, BMN) secara idempoten ke BKSDA Drive';

    public function handle(): int
    {
        $module = $this->option('module');
        $limit = (int) $this->option('limit');

        $this->info("Memulai backfill arsip resmi (Modul: {$module}, Limit: {$limit})...");

        $archivedCount = 0;
        $skippedCount = 0;

        // 1. Surat Tugas
        if ($module === 'all' || $module === 'st') {
            $this->line("\n[1/2] Memproses Surat Tugas...");
            $letters = AssignmentLetter::whereNotNull('file_surat_path')
                ->where('file_surat_path', '!=', '')
                ->limit($limit)
                ->get();

            $bar = $this->output->createProgressBar($letters->count());
            $bar->start();

            foreach ($letters as $letter) {
                $alreadyArchived = DriveFile::where('source_module', 'surat_tugas')
                    ->where('source_id', (string) $letter->id)
                    ->exists();

                if ($alreadyArchived) {
                    $skippedCount++;
                } else {
                    if (Storage::disk('local')->exists($letter->file_surat_path)) {
                        ArchiveOfficialDocument::dispatchSync(
                            'surat_tugas',
                            $letter->id,
                            'local',
                            $letter->file_surat_path,
                            $letter->nomor_surat ? "ST-{$letter->nomor_surat}.pdf" : null,
                            null,
                            $letter->created_by
                        );
                        $archivedCount++;
                    } else {
                        $skippedCount++;
                    }
                }
                $bar->advance();
            }
            $bar->finish();
            $this->newLine();
        }

        // 2. Cuti Pegawai
        if ($module === 'all' || $module === 'cuti') {
            $this->line("\n[2/2] Memproses Pengajuan Cuti...");
            $leaves = EmployeeLeave::where(function ($q) {
                $q->whereNotNull('scan_surat_izin_path')
                  ->orWhereNotNull('scan_surat_path')
                  ->orWhereNotNull('scan_formulir_path');
            })
            ->limit($limit)
            ->get();

            $bar = $this->output->createProgressBar($leaves->count());
            $bar->start();

            foreach ($leaves as $leave) {
                $path = $leave->scan_surat_izin_path ?: ($leave->scan_surat_path ?: $leave->scan_formulir_path);
                if (!$path) {
                    $skippedCount++;
                    $bar->advance();
                    continue;
                }

                $alreadyArchived = DriveFile::where('source_module', 'cuti')
                    ->where('source_id', (string) $leave->id)
                    ->exists();

                if ($alreadyArchived) {
                    $skippedCount++;
                } else {
                    if (Storage::disk('local')->exists($path)) {
                        ArchiveOfficialDocument::dispatchSync(
                            'cuti',
                            $leave->id,
                            'local',
                            $path,
                            $leave->nomor_surat ? "SK-Cuti-{$leave->nomor_surat}.pdf" : null,
                            null,
                            $leave->created_by ?? null
                        );
                        $archivedCount++;
                    } else {
                        $skippedCount++;
                    }
                }
                $bar->advance();
            }
            $bar->finish();
            $this->newLine();
        }

        $this->info("\nBackfill selesai! Berhasil diarsipkan: {$archivedCount}, Dilewati/Sudah Ada: {$skippedCount}.");

        return Command::SUCCESS;
    }
}
