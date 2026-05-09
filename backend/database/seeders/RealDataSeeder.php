<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use App\Modules\Inventory\Models\Category;
use App\Modules\Inventory\Models\Item;
use App\Modules\Inventory\Models\Office;
use App\Modules\Inventory\Services\InventoryService;
use Carbon\Carbon;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema; // Added this import

class RealDataSeeder extends Seeder
{
    public function run(): void
    {
        // 1. Reset Database
        Schema::disableForeignKeyConstraints();
        \App\Modules\Inventory\Models\StockTransaction::truncate();
        \App\Modules\Inventory\Models\InventoryStock::truncate();
        Item::truncate();
        Category::truncate();
        Office::truncate();
        Schema::enableForeignKeyConstraints();

        // 2. Setup Base Data
        $samarinda = Office::firstOrCreate(['nama_kantor' => 'Samarinda'], ['lokasi' => 'Samarinda']);
        Office::firstOrCreate(['nama_kantor' => 'Tenggarong'], ['lokasi' => 'Tenggarong']);
        Office::firstOrCreate(['nama_kantor' => 'Berau'], ['lokasi' => 'Berau']);

        $catATK = Category::firstOrCreate(['nama_kategori' => 'ATK'], ['deskripsi' => 'Alat Tulis Kantor']);
        $catElektronik = Category::firstOrCreate(['nama_kategori' => 'Elektronik'], ['deskripsi' => 'Barang Elektronik']);

        $inventoryService = app(InventoryService::class);

        // 3. Define Transactions Data
        $transactions = [
            // Doc 00001
            [
                'doc' => '00001/UP_T',
                'date' => '2025-03-03',
                'cat' => $catElektronik,
                'items' => [
                    ['code' => '1.01.03.06.001.000006', 'name' => 'KABEL BELDEN', 'qty' => 10, 'unit' => 'METER', 'price' => 20000, 'buy_date' => '2025-02-03'],
                    ['code' => '1.01.03.06.001.000006', 'name' => 'KABEL BELDEN', 'qty' => 5, 'unit' => 'METER', 'price' => 10000, 'buy_date' => '2025-02-03'],
                    ['code' => '1.01.03.06.999.000006', 'name' => 'LY921 TERMINAL', 'qty' => 2, 'unit' => 'BUAH', 'price' => 15000, 'buy_date' => '2025-02-03'],
                    ['code' => '1.01.03.06.999.000011', 'name' => 'STEKER', 'qty' => 2, 'unit' => 'BUAH', 'price' => 10000, 'buy_date' => '2025-02-03'],
                ]
            ],
            // Doc 00002
            [
                'doc' => '00002/UP_T',
                'date' => '2025-03-03',
                'cat' => $catATK,
                'items' => [
                    ['code' => '1.01.03.04.004.000020', 'name' => 'REFIL 35 A', 'qty' => 3, 'unit' => 'BUAH', 'price' => 100000, 'buy_date' => '2025-02-04'],
                    ['code' => '1.01.03.04.004.000019', 'name' => 'REFIL 85 A', 'qty' => 2, 'unit' => 'BUAH', 'price' => 115000, 'buy_date' => '2025-02-10'],
                    ['code' => '1.01.03.04.004.000053', 'name' => 'REFILL HP 107', 'qty' => 2, 'unit' => 'BHN', 'price' => 150000, 'buy_date' => '2025-02-04'],
                    ['code' => '1.01.03.04.004.000022', 'name' => 'REFIL 12 A', 'qty' => 2, 'unit' => 'BUAH', 'price' => 75000, 'buy_date' => '2025-02-04'],
                ]
            ],
            // Doc 00003
            [
                'doc' => '00003/UP_T',
                'date' => '2025-03-03',
                'cat' => $catATK,
                'items' => [
                    ['code' => '1.01.03.02.001.000018', 'name' => 'KERTAS A4 75 gr', 'qty' => 25, 'unit' => 'RIM', 'price' => 57500, 'buy_date' => '2025-01-24'],
                ]
            ],
            // Doc 00004
            [
                'doc' => '00004/UP_T',
                'date' => '2025-03-03',
                'cat' => $catATK,
                'items' => [
                    ['code' => '1.01.03.02.001.000001', 'name' => 'KERTAS A4 70 gr', 'qty' => 4, 'unit' => 'RIM', 'price' => 55000, 'buy_date' => '2025-01-23'],
                ]
            ],
            // Doc 00005
            [
                'doc' => '00005/UP_T',
                'date' => '2025-03-03',
                'cat' => $catATK,
                'items' => [
                    ['code' => '1.01.03.99.999.000250', 'name' => 'DOUBLE TAPE', 'qty' => 1, 'unit' => 'BUAH', 'price' => 45000, 'buy_date' => '2025-02-11'],
                ]
            ],
            // Doc 00006
            [
                'doc' => '00006/UP_T',
                'date' => '2025-03-03',
                'cat' => $catElektronik,
                'items' => [
                    ['code' => '1.01.03.04.006.000007', 'name' => 'USB HUB', 'qty' => 1, 'unit' => 'BUAH', 'price' => 99750, 'buy_date' => '2025-02-24'],
                ]
            ],
            // Doc 00007
            [
                'doc' => '00007/UP_T',
                'date' => '2025-03-03',
                'cat' => $catATK,
                'items' => [
                    ['code' => '1.01.03.09.003.000001', 'name' => 'TRODAT STEMPEL', 'qty' => 4, 'unit' => 'BUAH', 'price' => 50000, 'buy_date' => '2025-01-06'],
                ]
            ],
            // Doc 00008
            [
                'doc' => '00008/UP_T',
                'date' => '2025-03-12',
                'cat' => $catATK,
                'items' => [
                    ['code' => '1.01.03.04.004.000003', 'name' => 'TINTA PRINTER CANON HITAM', 'qty' => 1, 'unit' => 'KOTAK', 'price' => 41350, 'buy_date' => '2025-02-04'],
                    ['code' => '1.01.03.04.004.000029', 'name' => 'DATA PRINT DP 27', 'qty' => 1, 'unit' => 'BUAH', 'price' => 8400, 'buy_date' => '2025-02-04'],
                    ['code' => '1.01.03.04.004.000030', 'name' => 'DATAPRINT DP 28', 'qty' => 1, 'unit' => 'BUAH', 'price' => 9850, 'buy_date' => '2025-02-04'],
                    ['code' => '1.01.03.04.004.000031', 'name' => 'TINTA E PRINT HITAM 200 ML', 'qty' => 5, 'unit' => 'BOTOL', 'price' => 48300, 'buy_date' => '2025-02-04'],
                ]
            ],
            // Doc 00009
            [
                'doc' => '00009/UP_T',
                'date' => '2025-03-12',
                'cat' => $catATK,
                'items' => [
                    ['code' => '1.01.03.02.001.000004', 'name' => 'KERTAS A4 70 gr', 'qty' => 5, 'unit' => 'RIM', 'price' => 55000, 'buy_date' => '2025-03-03'],
                    ['code' => '1.01.03.02.001.000004', 'name' => 'KERTAS A4 80 gr', 'qty' => 5, 'unit' => 'RIM', 'price' => 65000, 'buy_date' => '2025-02-17'],
                ]
            ],
            // Doc 00010
            [
                'doc' => '00010/UP_T',
                'date' => '2025-12-03',
                'cat' => $catATK,
                'items' => [
                    ['code' => '1.01.03.99.999.000192', 'name' => 'SABUN CUCI PIRING MAMA LEMON', 'qty' => 3, 'unit' => 'BUAH', 'price' => 8900, 'buy_date' => '2025-02-11'],
                    ['code' => '1.01.03.99.999.000008', 'name' => 'CLING PEMBERSIH KACA', 'qty' => 3, 'unit' => 'BUAH', 'price' => 8300, 'buy_date' => '2025-02-11'],
                    ['code' => '1.01.03.99.999.000185', 'name' => "NICE FACIAL TISSUE 200'S/40", 'qty' => 3, 'unit' => 'BUAH', 'price' => 33500, 'buy_date' => '2025-02-11'],
                ]
            ],
            // Doc 00011
            [
                'doc' => '00011/UP_T',
                'date' => '2025-12-03',
                'cat' => $catATK,
                'items' => [
                    ['code' => '1.01.03.99.999.000211', 'name' => 'SABUN CUCI', 'qty' => 3, 'unit' => 'BKS', 'price' => 17800, 'buy_date' => '2025-02-11'],
                ]
            ],
            // Doc 00012
            [
                'doc' => '00012/UP_T',
                'date' => '2025-12-03',
                'cat' => $catATK,
                'items' => [
                    ['code' => '1.01.03.01.014.000006', 'name' => 'Karcis Masuk Pengunjung Nusantara TWA.', 'qty' => 80, 'unit' => 'BKS', 'price' => 65000, 'buy_date' => '2025-02-28'],
                    ['code' => '1.01.03.01.014.000007', 'name' => 'Karcis Masuk Pengunjung Nusantara TWA.', 'qty' => 35, 'unit' => 'BKS', 'price' => 65000, 'buy_date' => '2025-02-28'],
                    ['code' => '1.01.03.01.014.000008', 'name' => 'Karcis Masuk Pengunjung Nusantara', 'qty' => 5, 'unit' => 'BKS', 'price' => 65000, 'buy_date' => '2025-02-28'],
                    ['code' => '1.01.03.01.014.000009', 'name' => 'Karcis Masuk Pengunjung Mancanegara', 'qty' => 25, 'unit' => 'BKS', 'price' => 65000, 'buy_date' => '2025-02-28'],
                    ['code' => '1.01.03.01.014.000022', 'name' => 'Karcis Masuk Pengunjung Nusantara', 'qty' => 5, 'unit' => 'BKS', 'price' => 65000, 'buy_date' => null],
                ]
            ],
            // Doc 00013
            [
                'doc' => '00013/UP_T',
                'date' => '2025-12-03',
                'cat' => $catATK,
                'items' => [
                    ['code' => '1.01.03.04.004.000019', 'name' => 'REFIL 85 A', 'qty' => 1, 'unit' => 'BUAH', 'price' => 290000, 'buy_date' => '2025-03-06'],
                ]
            ],
            // Doc 00014
            [
                'doc' => '00014/UP_T',
                'date' => '2025-12-03',
                'cat' => $catElektronik,
                'items' => [
                    ['code' => '1.01.03.06.002.000007', 'name' => 'lampu 5 watt', 'qty' => 13, 'unit' => 'BKS', 'price' => 10000, 'buy_date' => '2025-01-21'],
                ]
            ],
            // Doc 00015
            [
                'doc' => '00015/UP_T',
                'date' => '2025-12-03',
                'cat' => $catElektronik,
                'items' => [
                    ['code' => '1.01.03.06.002.000010', 'name' => 'LAMPU PHILIP', 'qty' => 2, 'unit' => 'BKS', 'price' => 27000, 'buy_date' => '2025-01-20'],
                ]
            ],
            // Doc 00016
            [
                'doc' => '00016/UP_T',
                'date' => '2025-12-03',
                'cat' => $catElektronik,
                'items' => [
                    ['code' => '1.01.03.06.001.000021', 'name' => 'KABEL', 'qty' => 5, 'unit' => 'METER', 'price' => 15000, 'buy_date' => '2025-01-20'],
                    ['code' => '1.01.03.06.999.000006', 'name' => 'LY921 TERMINAL', 'qty' => 1, 'unit' => 'BUAH', 'price' => 35000, 'buy_date' => '2025-01-20'],
                    ['code' => '1.01.03.06.999.000011', 'name' => 'STEKER', 'qty' => 1, 'unit' => 'BUAH', 'price' => 15000, 'buy_date' => '2025-01-20'],
                ]
            ],
            // Doc 00017
            [
                'doc' => '00017/UP_T',
                'date' => '2025-12-03',
                'cat' => $catElektronik,
                'items' => [
                    ['code' => '1.01.03.06.999.000006', 'name' => 'LY921 TERMINAL', 'qty' => 1, 'unit' => 'BUAH', 'price' => 42000, 'buy_date' => '2025-01-17'],
                    ['code' => '1.01.03.99.999.000252', 'name' => 'MIC', 'qty' => 1, 'unit' => 'BUAH', 'price' => 248500, 'buy_date' => '2025-01-17'],
                    ['code' => '1.01.03.99.999.000253', 'name' => 'KABEL MIC', 'qty' => 1, 'unit' => 'BUAH', 'price' => 70000, 'buy_date' => '2025-01-17'],
                ]
            ],
            // Doc 00018
            [
                'doc' => '00018/UP_T',
                'date' => '2025-12-03',
                'cat' => $catATK,
                'items' => [
                    ['code' => '1.01.03.99.999.000029', 'name' => 'PENGHARUM TOILET', 'qty' => 1, 'unit' => 'BUAH', 'price' => 27500, 'buy_date' => '2025-02-22'],
                    ['code' => '1.01.03.99.999.000220', 'name' => 'GLADE SEMPROT', 'qty' => 1, 'unit' => 'BUAH', 'price' => 42000, 'buy_date' => '2025-02-22'],
                ]
            ],
            // Doc 00019
            [
                'doc' => '00019/UP_T',
                'date' => '2025-12-03',
                'cat' => $catATK,
                'items' => [
                    ['code' => '1.01.03.99.999.000251', 'name' => 'SABUN CUCI SIRIH', 'qty' => 1, 'unit' => 'BUAH', 'price' => 26900, 'buy_date' => '2025-03-17'],
                ]
            ],
            // Doc 00020
            [
                'doc' => '00020/UP_T',
                'date' => '2025-12-03',
                'cat' => $catATK,
                'items' => [
                    ['code' => '1.01.03.01.999.000184', 'name' => 'MIKA FILM', 'qty' => 1, 'unit' => 'BUAH', 'price' => 85000, 'buy_date' => '2025-01-16'],
                    ['code' => '1.01.03.01.999.000185', 'name' => 'BORNEO LINEN', 'qty' => 1, 'unit' => 'BUAH', 'price' => 7000, 'buy_date' => '2025-01-16'],
                    ['code' => '1.01.03.01.999.000187', 'name' => 'HIGHLIGHTER', 'qty' => 2, 'unit' => 'BUAH', 'price' => 15000, 'buy_date' => '2025-02-17'],
                    ['code' => '1.01.03.02.004.000002', 'name' => 'AMPLOP PUTIH BESAR', 'qty' => 1, 'unit' => 'KOTAK', 'price' => 61000, 'buy_date' => '2025-02-17'],
                ]
            ],
        ];

        // 4. Create Items & Record Transactions
        foreach ($transactions as $docGroup) {
            foreach ($docGroup['items'] as $itemData) {

                // Find or Create Item
                $item = Item::firstOrCreate(
                    ['code' => $itemData['code']],
                    [
                        'name' => $itemData['name'],
                        'category_id' => $docGroup['cat']->id,
                        'unit' => $itemData['unit'],
                        'min_stock' => 0, // Initial 0, will be added by trx
                    ]
                );

                // Create Transaction
                $inventoryService->recordStockIn([
                    'item_id' => $item->id,
                    'warehouse_id' => $samarinda->id,
                    'date' => $docGroup['date'],
                    'quantity' => $itemData['qty'],
                    'reference_number' => $docGroup['doc'],
                    'source_receiver' => '-', // Default to dash as requested
                    'notes' => 'Import Data Excel',
                    'purchase_date' => $itemData['buy_date'],
                    'price_per_unit' => $itemData['price'],
                    'total_price' => $itemData['qty'] * $itemData['price'],
                ]);
            }
        }
    }
}
