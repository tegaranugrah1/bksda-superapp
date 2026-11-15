<?php

namespace App\Console\Commands;

use App\Models\PortalNotification;
use App\Modules\Bmn\Models\Asset;
use App\Modules\Bmn\Models\AssetLoan;
use App\Services\PortalNotificationService;
use Carbon\Carbon;
use Illuminate\Console\Command;

class BmnNotifyDeadlinesCommand extends Command
{
    protected $signature = 'bmn:notify-deadlines';

    protected $description = 'Promosikan pinjaman BMN terlambat dan kirim pengingat pajak STNK, ganti plat, serta tenggat peminjaman (idempoten).';

    public function handle(PortalNotificationService $notifier): int
    {
        $today = now()->startOfDay();
        $todayStr = $today->toDateString();

        // Promosikan status peminjaman jatuh tempo agar sinkron meski halaman admin belum dibuka.
        AssetLoan::where('status', 'dipinjam')
            ->whereNotNull('due_date')
            ->where('due_date', '<', $todayStr)
            ->update(['status' => 'terlambat']);

        $sentCount = 0;

        // 1. Pengingat Pajak STNK & Ganti Plat 5 Tahunan kendaraan operasional
        Asset::where('jenis_bmn', 'ALAT ANGKUTAN BERMOTOR')
            ->where(function ($q) {
                $q->whereNotNull('tanggal_pajak_stnk')->orWhereNotNull('tanggal_ganti_plat');
            })
            ->chunkById(100, function ($vehicles) use ($today, $notifier, &$sentCount) {
                foreach ($vehicles as $vehicle) {
                    foreach ([
                        'stnk' => ['date' => $vehicle->tanggal_pajak_stnk, 'label' => 'Pajak STNK'],
                        'plat' => ['date' => $vehicle->tanggal_ganti_plat, 'label' => 'Ganti Plat 5 Tahunan'],
                    ] as $kind => $meta) {
                        if (! $meta['date']) {
                            continue;
                        }
                        $due = Carbon::parse($meta['date'])->startOfDay();
                        $bucket = $this->classifyVehicleDeadline($due, $today);
                        if (! $bucket) {
                            continue;
                        }

                        $unit = trim($vehicle->nama_barang . ($vehicle->no_polisi ? " ({$vehicle->no_polisi})" : ''));
                        $baseKey = "{$kind}:{$vehicle->id}:{$bucket['tag']}";

                        if ($vehicle->employee_id && ! $this->alreadySent("{$baseKey}:emp")) {
                            if ($notifier->notifyEmployee(
                                (int) $vehicle->employee_id,
                                "Pengingat {$meta['label']} Kendaraan BMN",
                                "{$meta['label']} {$unit} {$bucket['label']}.",
                                'bmn',
                                'aset',
                                (string) $vehicle->id,
                                ['asset_id' => (string) $vehicle->id, 'dedup_key' => "{$baseKey}:emp", 'event' => "{$kind}_deadline"]
                            )) {
                                $sentCount++;
                            }
                        }

                        if (! $this->alreadySent("{$baseKey}:admin")) {
                            $sentCount += $notifier->notifyAdmins(
                                'bmn',
                                "Peringatan {$meta['label']} BMN",
                                "{$meta['label']} {$unit} {$bucket['label']}.",
                                'bmn',
                                null,
                                (string) $vehicle->id,
                                ['asset_id' => (string) $vehicle->id, 'link' => '/bmn', 'dedup_key' => "{$baseKey}:admin", 'event' => "{$kind}_deadline"]
                            );
                        }
                    }
                }
            });

        // 2. Pengingat Batas Pengembalian & Peminjaman Terlambat
        AssetLoan::with(['asset:id,nama_barang,kode_barang,deleted_at', 'borrower:id,nama_lengkap'])
            ->whereIn('status', ['dipinjam', 'terlambat'])
            ->whereNotNull('due_date')
            ->whereHas('asset')
            ->chunkById(100, function ($loans) use ($today, $notifier, &$sentCount) {
                foreach ($loans as $loan) {
                    $due = Carbon::parse($loan->due_date)->startOfDay();
                    $days = (int) $today->diffInDays($due, false);
                    if ($days > 3) {
                        continue;
                    }

                    $tag = match (true) {
                        $days < 0 => 'overdue:' . $today->format('o-W'),
                        $days === 0 => 'h0:' . $due->toDateString(),
                        default => 'h3:' . $due->toDateString(),
                    };

                    $statusText = match (true) {
                        $days < 0 => 'melewati batas kembali (' . abs($days) . ' hari)',
                        $days === 0 => 'jatuh tempo pengembalian hari ini',
                        default => "mendekati batas kembali ({$days} hari lagi)",
                    };

                    $assetName = $loan->asset?->nama_barang ?? 'Aset BMN';
                    $borrowerName = $loan->borrower?->nama_lengkap ?? 'Pegawai';
                    $baseKey = "loan:{$loan->id}:{$tag}";

                    if (! $this->alreadySent("{$baseKey}:emp")) {
                        if ($notifier->notifyEmployee(
                            (int) $loan->employee_id,
                            $days < 0 ? 'Peminjaman Aset BMN Terlambat' : 'Pengingat Pengembalian Aset BMN',
                            "Peminjaman {$assetName} {$statusText}.",
                            'bmn',
                            'pinjaman',
                            (string) $loan->id,
                            ['asset_id' => (string) $loan->asset_id, 'loan_id' => (string) $loan->id, 'dedup_key' => "{$baseKey}:emp", 'event' => 'loan_deadline']
                        )) {
                            $sentCount++;
                        }
                    }

                    if ($days < 0 && ! $this->alreadySent("{$baseKey}:admin")) {
                        $sentCount += $notifier->notifyAdmins(
                            'bmn',
                            'Peminjaman BMN Melewati Batas Waktu',
                            "Peminjaman {$assetName} oleh {$borrowerName} {$statusText}.",
                            'bmn',
                            null,
                            (string) $loan->id,
                            ['asset_id' => (string) $loan->asset_id, 'loan_id' => (string) $loan->id, 'link' => '/bmn', 'dedup_key' => "{$baseKey}:admin", 'event' => 'loan_overdue']
                        );
                    }
                }
            });

        $this->info("BMN deadlines processed. Notifications created: {$sentCount}");

        return self::SUCCESS;
    }

    /**
     * @return array{tag: string, label: string}|null
     */
    private function classifyVehicleDeadline(Carbon $due, Carbon $today): ?array
    {
        $days = (int) $today->diffInDays($due, false);
        if ($days > 30) {
            return null;
        }

        return match (true) {
            $days < 0 => ['tag' => 'overdue:' . $today->format('o-W'), 'label' => 'sudah melewati jatuh tempo (' . abs($days) . ' hari)'],
            $days === 0 => ['tag' => 'h0:' . $due->toDateString(), 'label' => 'jatuh tempo hari ini'],
            $days <= 7 => ['tag' => 'h7:' . $due->toDateString(), 'label' => "jatuh tempo {$days} hari lagi ({$due->toDateString()})"],
            default => ['tag' => 'h30:' . $due->toDateString(), 'label' => "jatuh tempo {$days} hari lagi ({$due->toDateString()})"],
        };
    }

    private function alreadySent(string $dedupKey): bool
    {
        return PortalNotification::where('type', 'bmn')
            ->where('data->dedup_key', $dedupKey)
            ->exists();
    }
}
