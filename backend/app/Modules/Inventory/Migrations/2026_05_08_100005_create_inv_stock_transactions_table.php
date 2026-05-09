<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('inv_stock_transactions', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->foreignUuid('office_id')->constrained('inv_offices')->cascadeOnDelete();
            $table->foreignUuid('item_id')->constrained('inv_items')->cascadeOnDelete();

            // Jenis Mutasi
            $table->enum('type', ['in', 'out', 'adjustment']);

            $table->integer('quantity'); // Jumlah yang keluar/masuk
            $table->integer('remaining_stock'); // Saldo akhir setelah transaksi (Wajib ada untuk audit)
            $table->text('keterangan')->nullable();

            // Siapa Admin yang mengetik transaksi ini (Sistem Keamanan)
            $table->foreignId('user_id')->constrained('users')->restrictOnDelete();

            // Jika barang keluar, dicatat Pegawai siapa yang meminta/mengambilnya (Lintas Modul)
            $table->foreignId('employee_id')->nullable()->constrained('kpg_employees')->nullOnDelete();

            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('inv_stock_transactions');
    }
};
