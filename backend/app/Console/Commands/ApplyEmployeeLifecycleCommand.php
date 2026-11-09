<?php

namespace App\Console\Commands;

use App\Models\User;
use App\Modules\Kepegawaian\Models\Employee;
use App\Modules\Kepegawaian\Models\EmployeeHistory;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;

class ApplyEmployeeLifecycleCommand extends Command
{
    /**
     * The name and signature of the console command.
     */
    protected $signature = 'employee:apply-lifecycle';

    /**
     * The console command description.
     */
    protected $description = 'Menerapkan penonaktifan pegawai yang telah mencapai atau melewati tanggal TMT nonaktif (idempotent)';

    /**
     * Execute the console command.
     */
    public function handle(): int
    {
        $today = now()->toDateString();
        $this->info("Memeriksa jadwal penonaktifan pegawai per tanggal: {$today} (WITA)...");

        // Cari pegawai yang masih aktif tapi tanggal TMT sudah tiba atau lewat
        $dueEmployees = Employee::where('is_active', true)
            ->whereNotNull('inactive_effective_date')
            ->where('inactive_effective_date', '<=', $today)
            ->get();

        if ($dueEmployees->isEmpty()) {
            $this->info('Tidak ada jadwal penonaktifan pegawai yang jatuh tempo hari ini.');
            return Command::SUCCESS;
        }

        $processed = 0;
        $failed = 0;

        foreach ($dueEmployees as $employee) {
            try {
                DB::transaction(function () use ($employee) {
                    $locked = Employee::lockForUpdate()->find($employee->id);
                    if (! $locked || ! $locked->is_active) {
                        return; // Sudah diproses worker lain (idempotent)
                    }

                    $nip = trim((string) $locked->nip);
                    $user = $nip !== '' ? User::where('username', $nip)->lockForUpdate()->first() : null;

                    $locked->update([
                        'is_active' => false,
                    ]);

                    if ($user) {
                        $user->update(['is_active' => false]);
                        $user->tokens()->delete();
                    }

                    EmployeeHistory::create([
                        'employee_id' => $locked->id,
                        'user_id' => null, // Sistem scheduler otomatis
                        'action' => 'DEACTIVATE_EMPLOYEE',
                        'changes' => [
                            'is_active' => ['old' => true, 'new' => false],
                            'inactive_reason' => ['old' => $locked->inactive_reason, 'new' => $locked->inactive_reason],
                            'inactive_effective_date' => ['old' => $locked->inactive_effective_date?->toDateString(), 'new' => $locked->inactive_effective_date?->toDateString()],
                        ],
                        'notes' => "Eksekusi otomatis scheduler penonaktifan pegawai per TMT {$locked->inactive_effective_date?->toDateString()} ({$locked->inactive_reason})",
                        'created_at' => now(),
                    ]);
                });

                $this->line(" - Pegawai ID {$employee->id} ({$employee->nama_lengkap}) berhasil dinonaktifkan.");
                $processed++;
            } catch (\Throwable $e) {
                $this->error(" Gagal memproses Pegawai ID {$employee->id}: {$e->getMessage()}");
                Log::error("ApplyEmployeeLifecycleCommand error for employee {$employee->id}: " . $e->getMessage(), [
                    'exception' => $e,
                ]);
                $failed++;
            }
        }

        $this->info("Selesai. Diproses: {$processed}, Gagal: {$failed}.");

        return $failed > 0 ? Command::FAILURE : Command::SUCCESS;
    }
}
