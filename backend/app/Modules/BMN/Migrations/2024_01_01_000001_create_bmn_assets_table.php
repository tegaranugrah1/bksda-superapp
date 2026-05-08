<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('bmn_assets', function (Blueprint $table) {
            $table->uuid('id')->primary();

            // Identitas BMN Negara
            $table->string('kode_barang', 50)->index();
            $table->string('nup', 20)->index()->comment('Nomor Urut Pendaftaran BPK');
            $table->string('nama_barang');
            $table->string('merk_tipe')->nullable();

            // Kondisi & Tahun
            $table->integer('tahun_perolehan')->nullable();
            $table->enum('kondisi', ['Baik', 'Rusak Ringan', 'Rusak Berat'])->default('Baik');

            // Finansial
            $table->decimal('nilai_perolehan', 15, 2)->default(0);
            $table->decimal('nilai_buku', 15, 2)->default(0);

            // Keberadaan
            $table->string('lokasi_spesifik')->nullable();
            $table->foreignUuid('employee_id')->nullable()->constrained('kpg_employees')->nullOnDelete();

            // Bukti Visual
            $table->string('foto_url', 1000)->nullable();
            $table->text('keterangan')->nullable();

            // Jejak Sistem
            $table->timestamps();
            $table->softDeletes(); // BMN Dilarang Dihapus Permanen! (Aturan BPK)

            // Satu kode barang + NUP tidak boleh ada yang kembar
            $table->unique(['kode_barang', 'nup']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('bmn_assets');
    }
};
