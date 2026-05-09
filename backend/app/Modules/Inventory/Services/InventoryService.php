<?php

namespace App\Modules\Inventory\Services;

use App\Modules\Inventory\Models\InventoryStock;
use App\Modules\Inventory\Models\Item;
use App\Modules\Inventory\Models\StockTransaction;
use Exception;
use Illuminate\Support\Facades\DB;

class InventoryService
{
    /**
     * FUNGSI 1: MUTASI MASUK (STOCK IN)
     * Saat Instansi melakukan pengadaan / belanja barang baru.
     */
    public function stockIn(array $data): StockTransaction
    {
        return DB::transaction(function () use ($data) {
            // 1. Cari Kartu Stok di Kantor tersebut, atau buat baru jika belum ada barangnya sama sekali
            $stock = InventoryStock::firstOrCreate(
                [
                    'office_id' => $data['office_id'],
                    'item_id' => $data['item_id'],
                ],
                [
                    'quantity' => 0, // Inisiasi jumlah 0 jika ini barang baru datang
                ]
            );

            // 2. Tambahkan fisik barang
            $stock->quantity += $data['quantity'];
            $stock->save();

            // 3. Catat di Buku Kas Mutasi Logistik (Anti-Korupsi)
            $transaction = StockTransaction::create([
                'office_id' => $data['office_id'],
                'item_id' => $data['item_id'],
                'type' => 'in',
                'quantity' => $data['quantity'],
                'remaining_stock' => $stock->quantity, // Ambil saldo ter-Update
                'keterangan' => $data['keterangan'] ?? null,
                'user_id' => $data['user_id'], // Admin yang bertugas
                'employee_id' => null, // Mutasi masuk tidak melibatkan peminta/pegawai
            ]);

            return $transaction;
        });
    }

    /**
     * FUNGSI 2: MUTASI KELUAR (STOCK OUT)
     * Saat Pegawai meminta jatah barang ke admin persediaan kantor.
     */
    public function stockOut(array $data): StockTransaction
    {
        return DB::transaction(function () use ($data) {
            // 1. Kunci Baris Tabel (Pessimistic Locking) agar tidak terjadi bentrok jika diakses bersamaan
            $stock = InventoryStock::where('office_id', $data['office_id'])
                ->where('item_id', $data['item_id'])
                ->lockForUpdate() // Cegah Race Condition
                ->first();

            // 2. Cek Eksistensi: Apakah barang tersebut memang ada di Kantor ini?
            if (! $stock) {
                throw new Exception('Barang tidak ditemukan di Kantor/Penyimpanan yang dipilih.');
            }

            // 3. Validasi Defisit: Apakah saldo cukup untuk dikeluarkan?
            if ($stock->quantity < $data['quantity']) {
                $item = Item::find($data['item_id']);
                throw new Exception("Stok tidak mencukupi! Sisa '{$item->nama_barang}' di kantor ini hanya {$stock->quantity} {$item->satuan}.");
            }

            // 4. Kurangi fisik barang
            $stock->quantity -= $data['quantity'];
            $stock->save();

            // 5. Catat di Buku Kas Mutasi Logistik
            $transaction = StockTransaction::create([
                'office_id' => $data['office_id'],
                'item_id' => $data['item_id'],
                'type' => 'out',
                'quantity' => $data['quantity'],
                'remaining_stock' => $stock->quantity, // Ambil saldo yang baru saja merosot
                'keterangan' => $data['keterangan'] ?? null,
                'user_id' => $data['user_id'], // Admin yang menyerahkan barang
                'employee_id' => $data['employee_id'], // WAJIB: Siapa pegawai BKSDA yang mengambilnya
            ]);

            return $transaction;
        });
    }
}
