<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('inv_items', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->foreignUuid('category_id')->constrained('inv_categories')->restrictOnDelete();

            $table->string('kode_barang')->unique(); // Barcode SKU internal
            $table->string('nama_barang');
            $table->string('satuan', 50); // Pcs, Rim, Box, Lembar
            $table->integer('min_stock')->default(0); // Peringatan jika stok hampir habis

            $table->timestamps();
            $table->softDeletes();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('inv_items');
    }
};
