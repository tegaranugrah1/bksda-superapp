<?php

namespace App\Console\Commands;

use App\Jobs\QueueHeartbeat;
use App\Models\User;
use App\Services\PortalNotificationService;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;

class HealthMonitorCommand extends Command
{
    /**
     * The name and signature of the console command.
     */
    protected $signature = 'app:monitor-health';

    /**
     * The console command description.
     */
    protected $description = 'Pantau kesehatan queue, reverb websocket, failed_jobs, dan ruang disk (Fase 0B.5)';

    /**
     * Execute the console command.
     */
    public function handle(PortalNotificationService $notifService): int
    {
        $issues = [];
        $statusOk = true;

        // 1. Cek Queue Worker via Heartbeat
        $lastHeartbeat = Cache::get('queue:heartbeat');
        if ($lastHeartbeat === null) {
            Cache::add('queue:heartbeat-first-dispatched-at', now()->timestamp, now()->addDay());
            if (now()->timestamp - (int) Cache::get('queue:heartbeat-first-dispatched-at') > 900) {
                $issues[] = 'Queue worker belum merespons heartbeat selama lebih dari 15 menit.';
                $statusOk = false;
            }
            QueueHeartbeat::dispatch();
            $this->line('[QUEUE] Heartbeat di-dispatch perdana.');
        } else {
            Cache::forget('queue:heartbeat-first-dispatched-at');
            $ageSeconds = now()->timestamp - (int) $lastHeartbeat;
            QueueHeartbeat::dispatch(); // Dispatch untuk interval berikutnya

            if ($ageSeconds > 900) { // Lebih dari 15 menit
                $minutes = round($ageSeconds / 60);
                $issues[] = "Queue worker macet atau tidak berjalan (heartbeat terakhir: {$minutes} menit lalu).";
                $statusOk = false;
                $this->error("[QUEUE] Macet ({$minutes}m lalu)");
            } else {
                $this->info("[QUEUE] Normal (heartbeat {$ageSeconds}d lalu)");
            }
        }

        // 2. Cek Reverb WebSocket daemon
        $broadcastConn = config('broadcasting.default');
        if ($broadcastConn === 'reverb') {
            $reverbHost = config('broadcasting.connections.reverb.options.host', 'localhost');
            $reverbPort = (int) config('broadcasting.connections.reverb.options.port', 8080);
            
            $socket = @fsockopen($reverbHost, $reverbPort, $errno, $errstr, 2);
            if (! is_resource($socket)) {
                $isDnsError = str_contains($errstr, 'getaddrinfo') || str_contains($errstr, 'php_network_getaddresses');
                $issues[] = $isDnsError
                    ? "DNS Reverb gagal: nama host {$reverbHost} tidak dapat diresolusi ({$errstr})."
                    : "Reverb di {$reverbHost}:{$reverbPort} gagal menerima koneksi TCP ({$errstr}).";
                $statusOk = false;
                $this->error("[REVERB] Offline: {$reverbHost}:{$reverbPort}");
            } else {
                fclose($socket);
                $this->info("[REVERB] TCP terjangkau: {$reverbHost}:{$reverbPort}; delivery WebSocket belum diuji oleh probe ini.");
            }
        }

        // 3. Cek failed_jobs 15 menit terakhir
        try {
            $recentFailed = DB::table('failed_jobs')
                ->where('failed_at', '>=', now()->subMinutes(15))
                ->count();

            if ($recentFailed > 0) {
                $issues[] = "Terdapat {$recentFailed} job gagal dalam 15 menit terakhir di antrean.";
                $statusOk = false;
                $this->error("[FAILED_JOBS] {$recentFailed} job gagal baru terdeteksi.");
            } else {
                $this->info("[FAILED_JOBS] Bersih (0 job gagal baru)");
            }
        } catch (\Throwable $e) {
            $this->warn('[FAILED_JOBS] Tidak dapat membaca tabel failed_jobs: '.$e->getMessage());
        }

        // 4. Cek Penggunaan Disk (storage)
        $storagePath = storage_path();
        $freeBytes = @disk_free_space($storagePath);
        $totalBytes = @disk_total_space($storagePath);

        if ($freeBytes !== false && $totalBytes !== false && $totalBytes > 0) {
            $usedPercent = round((1 - ($freeBytes / $totalBytes)) * 100, 1);
            $freeGB = round($freeBytes / 1073741824, 2);

            if ($usedPercent >= 80) {
                $issues[] = "Penyimpanan hampir penuh: {$usedPercent}% terpakai ({$freeGB} GB tersisa).";
                $statusOk = false;
                $this->error("[DISK] Penuh ({$usedPercent}% terpakai)");
            } else {
                $this->info("[DISK] Aman ({$usedPercent}% terpakai, {$freeGB} GB bebas)");
            }
        }

        // 5. Kirim Notifikasi jika ada masalah (deduplikasi 1x per jam)
        if (! $statusOk && ! empty($issues)) {
            $dedupKey = 'monitor:alert_health_dedup';
            if (! Cache::has($dedupKey)) {
                $alertMessage = implode("\n- ", $issues);
                Log::error("SISTEM HEALTH MONITOR MENEMUKAN MASALAH:\n- ".$alertMessage);

                // Kirim notifikasi ke super_admin
                $superAdmins = User::where('role', 'super_admin')->get();
                foreach ($superAdmins as $admin) {
                    $notifService->notifyUser(
                        $admin->id,
                        'Peringatan Kesehatan Sistem',
                        "Terdeteksi masalah operasional pada backend:\n- ".$alertMessage,
                        'system',
                        'pengaturan'
                    );
                }

                Cache::put($dedupKey, true, now()->addHour());
                $this->warn('Peringatan dikirimkan ke super administrator (dedup 1 jam aktif).');
            } else {
                $this->line('Peringatan disembunyikan (dedup 1 jam masih aktif).');
            }

            return Command::FAILURE;
        }

        return Command::SUCCESS;
    }
}
