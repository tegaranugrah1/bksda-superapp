<?php

namespace App\Modules\Bmn\Services;

use App\Modules\Bmn\Models\Asset;
use App\Modules\Bmn\Models\AssetLoan;
use App\Modules\Bmn\Models\AssetUpdate;
use App\Modules\Kepegawaian\Models\Employee;
use Exception;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;

class LoanService
{
    /**
     * List loans with filters and pagination.
     */
    public function listLoans(array $filters, int $perPage = 10)
    {
        // Auto-update overdue loans
        AssetLoan::where('status', 'dipinjam')
            ->whereNotNull('due_date')
            ->where('due_date', '<', now()->toDateString())
            ->update(['status' => 'terlambat']);

        $query = AssetLoan::with(['asset', 'borrower']);

        if (!empty($filters['status']) && $filters['status'] !== 'all') {
            $query->where('status', $filters['status']);
        }

        if (!empty($filters['employee_id'])) {
            $query->where('employee_id', (int) $filters['employee_id']);
        }

        if (!empty($filters['search'])) {
            $s = addcslashes((string) $filters['search'], '%_');
            $likeOp = DB::connection()->getDriverName() === 'pgsql' ? 'ilike' : 'like';
            $query->where(function ($q) use ($s, $likeOp) {
                $q->where('purpose', $likeOp, "%{$s}%")
                    ->orWhere('notes', $likeOp, "%{$s}%")
                    ->orWhereHas('asset', function ($aq) use ($s, $likeOp) {
                        $aq->where('nama_barang', $likeOp, "%{$s}%")
                            ->orWhere('kode_barang', $likeOp, "%{$s}%")
                            ->orWhere('nup', $likeOp, "%{$s}%");
                    })
                    ->orWhereHas('borrower', function ($bq) use ($s, $likeOp) {
                        $bq->where('nama_lengkap', $likeOp, "%{$s}%")
                            ->orWhere('nip', $likeOp, "%{$s}%");
                    });
            });
        }

        return $query->orderBy('created_at', 'desc')->paginate($perPage);
    }

    /**
     * Create loan records for multiple assets (bulk).
     */
    public function createLoan(array $data): array
    {
        return DB::transaction(function () use ($data) {
            $createdLoans = [];

            foreach ($data['asset_ids'] as $assetId) {
                $asset = Asset::lockForUpdate()->findOrFail($assetId);

                // Check if asset already has an active loan
                if ($asset->loans()->active()->exists()) {
                    throw new Exception("Aset '{$asset->nama_barang}' sedang dalam peminjaman aktif.");
                }

                $loanData = [
                    'asset_id' => $asset->id,
                    'employee_id' => $data['borrower_employee_id'],
                    'tanggal_pinjam' => $data['loan_date'],
                    'due_date' => $data['due_date'] ?? null,
                    'purpose' => $data['purpose'] ?? null,
                    'notes' => $data['notes'] ?? null,
                    'status' => 'dipinjam',
                ];

                $record = AssetLoan::create($loanData);
                $asset->update(['employee_id' => $data['borrower_employee_id']]);

                // Record asset history
                $borrowerName = Employee::find($data['borrower_employee_id'])?->nama_lengkap ?? 'Pegawai';
                AssetUpdate::create([
                    'asset_id' => $asset->id,
                    'user_id' => Auth::id(),
                    'field_changed' => 'Peminjaman',
                    'old_value' => 'Tersedia',
                    'new_value' => "Dipinjam oleh {$borrowerName}",
                    'alasan_perubahan' => $data['purpose'] ?? 'Peminjaman aset',
                ]);

                $createdLoans[] = $record->load(['asset', 'borrower']);

                try {
                    app(\App\Services\PortalNotificationService::class)->notifyEmployee(
                        $data['borrower_employee_id'],
                        'Peminjaman Aset BMN',
                        "Aset {$asset->nama_barang}".($asset->kode_barang ? " ({$asset->kode_barang})" : '').' telah dicatat dipinjamkan kepada Anda.',
                        'bmn',
                        'pinjaman',
                        (string) $record->id,
                        ['asset_id' => $asset->id, 'loan_id' => $record->id]
                    );
                } catch (\Throwable $e) {
                    // Ignore background failure
                }
            }

            return $createdLoans;
        });
    }

    /**
     * Legacy: borrow a single asset (kept for backward compatibility).
     */
    public function borrowAsset(string $assetId, string $employeeId, array $data)
    {
        return DB::transaction(function () use ($assetId, $employeeId, $data) {
            $asset = Asset::lockForUpdate()->findOrFail($assetId);

            if ($asset->employee_id !== null) {
                throw new Exception('Sistem menolak! Aset ini masih tercatat di bawah tanggung jawab pegawai lain.');
            }

            $loan = AssetLoan::create([
                'asset_id' => $asset->id,
                'employee_id' => $employeeId,
                'tanggal_pinjam' => $data['tanggal_pinjam'] ?? now()->toDateString(),
                'due_date' => $data['due_date'] ?? null,
                'purpose' => $data['purpose'] ?? null,
                'notes' => $data['notes'] ?? null,
                'status' => 'dipinjam',
                'keterangan' => $data['keterangan'] ?? null,
            ]);

            $asset->update(['employee_id' => $employeeId]);

            try {
                app(\App\Services\PortalNotificationService::class)->notifyEmployee(
                    $employeeId,
                    'Peminjaman Aset BMN',
                    "Aset {$asset->nama_barang} telah dicatat dipinjamkan kepada Anda.",
                    'bmn',
                    'pinjaman',
                    (string) $loan->id,
                    ['asset_id' => $asset->id, 'loan_id' => $loan->id]
                );
            } catch (\Throwable $e) {
                // Ignore background failure
            }

            return $loan;
        });
    }

    /**
     * Update a loan record.
     */
    public function updateLoan(string $loanId, array $data): AssetLoan
    {
        return DB::transaction(function () use ($loanId, $data) {
            $loan = AssetLoan::lockForUpdate()->findOrFail($loanId);

            if ($loan->status === 'dikembalikan') {
                throw new Exception('Peminjaman yang sudah dikembalikan tidak dapat diedit.');
            }

            $updateData = [];
            if (isset($data['borrower_employee_id'])) $updateData['employee_id'] = $data['borrower_employee_id'];
            if (isset($data['loan_date'])) $updateData['tanggal_pinjam'] = $data['loan_date'];
            if (array_key_exists('due_date', $data)) $updateData['due_date'] = $data['due_date'];
            if (isset($data['purpose'])) $updateData['purpose'] = $data['purpose'];
            if (isset($data['notes'])) $updateData['notes'] = $data['notes'];

            $effectiveLoanDate = $updateData['tanggal_pinjam'] ?? $loan->tanggal_pinjam;
            $effectiveDueDate = array_key_exists('due_date', $updateData) ? $updateData['due_date'] : $loan->due_date;
            if ($effectiveDueDate && $effectiveLoanDate && strtotime((string) $effectiveDueDate) < strtotime((string) $effectiveLoanDate)) {
                throw new Exception('Tanggal batas kembali (due date) tidak boleh mendahului tanggal peminjaman.');
            }

            $loan->update($updateData);
            $loan->load(['asset', 'borrower']);

            return $loan;
        });
    }

    /**
     * Return an asset from a loan.
     */
    public function returnAsset(string $loanId, array $data = [])
    {
        return DB::transaction(function () use ($loanId, $data) {
            $loan = AssetLoan::lockForUpdate()->findOrFail($loanId);

            if ($loan->status === 'dikembalikan') {
                throw new Exception('Buku catatan sudah ditutup. Aset ini sudah lama dikembalikan.');
            }

            $loan->update([
                'status' => 'dikembalikan',
                'tanggal_kembali' => $data['tanggal_kembali'] ?? now()->toDateString(),
                'return_condition' => $data['return_condition'] ?? null,
                'keterangan' => ($loan->keterangan ? $loan->keterangan . ' | ' : '') . ($data['catatan_pengembalian'] ?? 'Telah dikembalikan.'),
            ]);

            $asset = Asset::findOrFail($loan->asset_id);
            $asset->update(['employee_id' => null]);

            // Record asset history
            $borrowerName = Employee::find($loan->employee_id)?->nama_lengkap ?? 'Pegawai';
            $conditionText = $data['return_condition'] ?? 'Tidak dicatat';
            AssetUpdate::create([
                'asset_id' => $asset->id,
                'user_id' => Auth::id(),
                'field_changed' => 'Pengembalian',
                'old_value' => "Dipinjam oleh {$borrowerName}",
                'new_value' => "Dikembalikan (Kondisi: {$conditionText})",
                'alasan_perubahan' => 'Pengembalian aset dari peminjaman',
            ]);

            try {
                app(\App\Services\PortalNotificationService::class)->notifyEmployee(
                    $loan->employee_id,
                    'Pengembalian Aset BMN',
                    "Pengembalian aset {$asset->nama_barang} telah berhasil dicatat.",
                    'bmn',
                    'pinjaman',
                    (string) $loan->id,
                    ['asset_id' => $asset->id, 'loan_id' => $loan->id]
                );
            } catch (\Throwable $e) {
                // Ignore background failure
            }

            return $loan;
        });
    }

    /**
     * Delete a loan record.
     */
    public function deleteLoan(string $loanId): void
    {
        DB::transaction(function () use ($loanId) {
            $loan = AssetLoan::lockForUpdate()->findOrFail($loanId);

            // If still active, release the asset
            if (in_array($loan->status, ['dipinjam', 'terlambat'])) {
                $asset = Asset::find($loan->asset_id);
                if ($asset && $asset->employee_id == $loan->employee_id) {
                    $asset->update(['employee_id' => null]);
                }
            }

            $loan->delete();
        });
    }
}
