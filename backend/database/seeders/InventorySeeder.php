<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use App\Modules\Inventory\Models\Category;
use App\Modules\Inventory\Models\Item;
use App\Modules\Inventory\Models\Warehouse;
use App\Modules\Inventory\Models\InventoryStock;

class InventorySeeder extends Seeder
{
    public function run(): void
    {
        // 1. Create Warehouses
        $samarinda = Warehouse::firstOrCreate(['name' => 'Samarinda']);
        $tenggarong = Warehouse::firstOrCreate(['name' => 'Tenggarong']);
        $berau = Warehouse::firstOrCreate(['name' => 'Berau']);

        // 2. Create Categories
        $catAtk = Category::firstOrCreate(['slug' => 'atk'], [
            'name' => 'Alat Tulis Kantor',
            'type' => 'consumable'
        ]);

        $catElektronik = Category::firstOrCreate(['slug' => 'elektronik'], [
            'name' => 'Elektronik',
            'type' => 'asset'
        ]);

        $catKebersihan = Category::firstOrCreate(['slug' => 'kebersihan'], [
            'name' => 'Alat Kebersihan',
            'type' => 'consumable'
        ]);

        // 3. Create Items
        $item1 = Item::firstOrCreate(['code' => 'ATK-001'], [
            'category_id' => $catAtk->id,
            'name' => 'Kertas A4 70gr',
            'unit' => 'Rim',
            'min_stock' => 10,
            'current_stock' => 50,
        ]);

        $item2 = Item::firstOrCreate(['code' => 'ATK-002'], [
            'category_id' => $catAtk->id,
            'name' => 'Pulpen Standard Hitam',
            'unit' => 'Pcs',
            'min_stock' => 24,
            'current_stock' => 100,
        ]);

        $item3 = Item::firstOrCreate(['code' => 'ELK-001'], [
            'category_id' => $catElektronik->id,
            'name' => 'Laptop Pengadaan 2024',
            'unit' => 'Unit',
            'min_stock' => 2,
            'current_stock' => 5,
            'description' => 'Laptop Inventaris Kantor'
        ]);

        // 4. Distribute Stock (Example)
        // Kertas A4: 30 in Samarinda, 20 in Tenggarong
        InventoryStock::updateOrCreate(
            ['item_id' => $item1->id, 'warehouse_id' => $samarinda->id],
            ['quantity' => 30]
        );
        InventoryStock::updateOrCreate(
            ['item_id' => $item1->id, 'warehouse_id' => $tenggarong->id],
            ['quantity' => 20]
        );

        // Pulpen: 100 in Samarinda
        InventoryStock::updateOrCreate(
            ['item_id' => $item2->id, 'warehouse_id' => $samarinda->id],
            ['quantity' => 100]
        );

        // Laptop: 2 in Samarinda, 2 in Tenggarong, 1 in Berau
        InventoryStock::updateOrCreate(
            ['item_id' => $item3->id, 'warehouse_id' => $samarinda->id],
            ['quantity' => 2]
        );
        InventoryStock::updateOrCreate(
            ['item_id' => $item3->id, 'warehouse_id' => $tenggarong->id],
            ['quantity' => 2]
        );
        InventoryStock::updateOrCreate(
            ['item_id' => $item3->id, 'warehouse_id' => $berau->id],
            ['quantity' => 1]
        );
    }
}
