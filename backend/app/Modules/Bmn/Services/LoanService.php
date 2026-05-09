<?php

namespace App\Modules\Bmn\Services;

use App\Modules\Bmn\Models\Asset;
use App\Modules\Bmn\Models\AssetLoan;
use Exception;
use Illuminate\Support\Facades\DB;

class LoanService
{
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
                'status' => 'dipinjam',
                'keterangan' => $data['keterangan'] ?? null,
            ]);

            $asset->update(['employee_id' => $employeeId]);

            return $loan;
        });
    }

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
                'keterangan' => ($loan->keterangan ? $loan->keterangan.' | ' : '').($data['catatan_pengembalian'] ?? 'Telah dikembalikan.'),
            ]);

            $asset = Asset::findOrFail($loan->asset_id);
            $asset->update(['employee_id' => null]);

            return $loan;
        });
    }
}
