<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('inv_inventory_stocks', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->foreignUuid('office_id')->constrained('inv_offices')->cascadeOnDelete();
            $table->foreignUuid('item_id')->constrained('inv_items')->cascadeOnDelete();

            $table->integer('quantity')->default(0); // Jumlah fisik di kantor tersebut
            $table->timestamps();

            // Pencegahan Duplikasi: Di satu kantor, tidak boleh ada 2 catatan stok untuk barang yang sama
            $table->unique(['office_id', 'item_id'], 'inv_office_item_unique');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('inv_inventory_stocks');
    }
};
