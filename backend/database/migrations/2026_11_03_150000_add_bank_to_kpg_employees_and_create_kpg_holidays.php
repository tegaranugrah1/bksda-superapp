<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        // 1. Tambah kolom nama_bank & nomor_rekening pada kpg_employees
        if (Schema::hasTable('kpg_employees')) {
            Schema::table('kpg_employees', function (Blueprint $table) {
                if (!Schema::hasColumn('kpg_employees', 'nama_bank')) {
                    $table->string('nama_bank', 50)->default('BRI')->after('satuan_kerja');
                }
                if (!Schema::hasColumn('kpg_employees', 'nomor_rekening')) {
                    $table->string('nomor_rekening', 50)->nullable()->after('nama_bank');
                }
            });
        }

        // 2. Buat tabel kpg_holidays untuk kustomisasi hari libur per tahun
        if (!Schema::hasTable('kpg_holidays')) {
            Schema::create('kpg_holidays', function (Blueprint $table) {
                $table->id();
                $table->date('tanggal')->unique();
                $table->smallInteger('tahun')->index();
                $table->string('nama', 150);
                $table->boolean('is_cuti_bersama')->default(false);
                $table->timestamps();
            });
        }
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('kpg_holidays');

        if (Schema::hasTable('kpg_employees')) {
            Schema::table('kpg_employees', function (Blueprint $table) {
                if (Schema::hasColumn('kpg_employees', 'nomor_rekening')) {
                    $table->dropColumn('nomor_rekening');
                }
                if (Schema::hasColumn('kpg_employees', 'nama_bank')) {
                    $table->dropColumn('nama_bank');
                }
            });
        }
    }
};
