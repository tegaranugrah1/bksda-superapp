<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('bmn_asset_loans', function (Blueprint $table) {
            $table->uuid('id')->primary();

            $table->foreignUuid('asset_id')->constrained('bmn_assets')->cascadeOnDelete();
            $table->foreignUuid('employee_id')->constrained('kpg_employees')->cascadeOnDelete();

            $table->date('tanggal_pinjam');
            $table->date('tanggal_kembali')->nullable()->comment('Kosong jika belum dikembalikan');
            $table->enum('status', ['dipinjam', 'dikembalikan'])->default('dipinjam');

            $table->text('keterangan')->nullable();

            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('bmn_asset_loans');
    }
};
