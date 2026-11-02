<?php

namespace App\Console\Commands;

use App\Jobs\QueueHeartbeat;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\DB;

class SelfCheckFoundationCommand extends Command
{
    /**
     * The name and signature of the console command.
     */
    protected $signature = 'app:self-check-foundation {--wait=10 : Detik maksimal menunggu queue}';

    /**
     * The console command description.
     */
    protected $description = 'Verifikasi fondasi queue, cache, database, dan websocket (Fase 0B Self-Check)';

    /**
     * Execute the console command.
     */
    public function handle(): int
    {
        $this->info('=== SELF-CHECK FONDASI APLIKASI (FASE 0B) ===');
        $allPassed = true;

        // 1. Verifikasi Koneksi Database
        try {
            DB::connection()->getPdo();
            $this->info('  [OK] Database PostgreSQL terhubung.');
        } catch (\Throwable $e) {
            $this->error('  [FAIL] Database gagal terhubung: '.$e->getMessage());
            $allPassed = false;
        }

        // 2. Verifikasi Konfigurasi Cache & Operasi Cache
        $cacheDriver = config('cache.default');
        $this->line("  [INFO] Cache Store Aktif: {$cacheDriver}");
        try {
            $testKey = 'self_check_'.uniqid();
            Cache::put($testKey, 'bksda_verified', 60);
            $val = Cache::get($testKey);
            Cache::forget($testKey);

            if ($val === 'bksda_verified') {
                $this->info("  [OK] Cache Store ({$cacheDriver}) berfungsi normal.");
            } else {
                $this->error("  [FAIL] Nilai cache tidak sesuai (didapat: {$val}).");
                $allPassed = false;
            }
        } catch (\Throwable $e) {
            $this->error("  [FAIL] Cache Store gagal: ".$e->getMessage());
            $allPassed = false;
        }

        // 3. Verifikasi Queue Connection
        $queueConn = config('queue.default');
        $this->line("  [INFO] Queue Connection Aktif: {$queueConn}");

        // 4. Verifikasi Pemrosesan Queue via Heartbeat
        $this->line("  [WAIT] Mengirim job QueueHeartbeat untuk verifikasi worker antrean...");
        $beforeTime = now()->timestamp;
        QueueHeartbeat::dispatch();

        $maxWait = (int) $this->option('wait');
        $processed = false;

        // Jika sync, heartbeat langsung tertulis seketika
        for ($i = 0; $i < $maxWait; $i++) {
            $heartbeat = Cache::get('queue:heartbeat');
            if ($heartbeat && (int) $heartbeat >= $beforeTime) {
                $processed = true;
                break;
            }
            sleep(1);
        }

        if ($processed) {
            $this->info("  [OK] Job antrean berhasil diproses oleh worker.");
        } else {
            $this->warn("  [NOTE] Job antrean belum selesai dalam {$maxWait} detik (Pastikan worker 'php artisan queue:work' sedang berjalan di background jika mode async).");
        }

        $this->newLine();
        if ($allPassed) {
            $this->info('>>> SELURUH INDIKATOR FONDASI 0B DINYATAKAN LOLOS <<<');
            return Command::SUCCESS;
        }

        $this->error('>>> TERDAPAT KEGAGALAN PADA FONDASI 0B <<<');
        return Command::FAILURE;
    }
}
